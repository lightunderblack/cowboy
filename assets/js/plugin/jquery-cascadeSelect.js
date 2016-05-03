( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
    var fullName = "cascade-select";

    if ( $.cowboy.isPluginExisten( $.camelCase( fullName ) ) ) {
        return;
    }

    var document = window.document,
        $document = $( document );

    var hasOwnProperty = ( {} ).hasOwnProperty;

    //模板
    var TEMPLATE = {
        hidden: "<input type=\"hidden\" name=\"{{name}}\" />",
        options: [
            "<option value=\"\">请选择</option>",
            "{{#options}}",
                "<option value=\"{{value}}\">{{text}}</option>",
            "{{/options}}"
        ].join( "" ),
        emptyOption: "<option value=\"\">请选择</option>"
    };

    //工具
    var Util = {
        /**
         * 生成依赖
         * @param  {[type]} all     所有select
         * @param  {[type]} current 当前select
         * @param  {[type]} i       当前索引
         * @return {[type]}
         */
        generateDepends: function( all, current, i ) {
            var j,
                length,
                prevItem,
                depends = [],
                prevItems = all.slice( 0, i ) || [];

            for ( j = 0, length = prevItems.length; j < length; j++ ) {
                prevItem = prevItems[ j ];
                if ( prevItem.depends ) {
                    depends.concat( prevItem.depends );
                } else {
                    depends.push( prevItem.paramName );
                }
            }

            return depends;
        },

        /**
         * 生成请求后台参数
         * @param  {[type]} map    [description]
         * @param  {[type]} select [description]
         * @return {[type]}        [description]
         */
        generateParams: function( map, select ) {
            var result,
                params = {},
                depends = select.depends;

            $.each( depends, function( i, depend ) {
                params[ depend ] = map[ depend ].val();
            } );
            result = $.extend( true, {}, params );
            params = null;

            return result;
        },

        /**
         * list转换成map
         * @param  {[type]} keyName 键值
         * @param  {[type]} list    list
         * @param  {[type]} deep    是否深拷贝
         * @return {[type]}
         */
        list2Map: function( keyName, list, valueName, deep ) {
            var keys,
                value,
                map = {};

            deep = !!deep;
            $.each( list || [], function( i, item ) {
                if ( keyName in item ) {
                    if ( valueName ) {
                        value = item[ valueName ];
                    } else {
                        value = deep ? $.extend( true, {}, item ) : item;
                    }
                    keys = ( item[ keyName ] || "" ).split( /[\,|\s+]/ );
                    $.each( keys, function() {
                        map[ this ] = value;
                    } );
                }
            } );

            return map;
        },

        /**
         * map转成string
         * @param  {[type]} concatStr key/value连接字符
         * @param  {[type]} joinStr   多个属性连接字符
         * @return {[type]}           [description]
         */
        map2String: function( map, concatStr, joinStr, encode ) {
            var result = [];

            joinStr = joinStr || "&";
            concatStr = concatStr || "=";
            encode = encode == null ? true : encode;
            $.each( map, function( key, value ) {
                result.push( [ key, encode ? encodeURIComponent( value ) : value ].join( concatStr ) );
            } );
            result = result.length ? result.join( joinStr ) : "";

            return result;
        }
    };

    var CascadeSelect = function( options ) {
        return new CascadeSelect.fn._init( options );
    };
    var prototypeFn = CascadeSelect.prototype;
    $.extend( prototypeFn, {
        fullName: fullName,

        //默认配置对象
        options: {

            //parse: null,//各个select公用数据解析函数
            /*remote: {
                url: "后台请求地址",
                requestType: "post or get"
            },//各个select公用remote配置*/
            autoLoad: true //默认自动载入数据
            /*
            //理论上级联菜单至少2级,selects数组元素顺序有从属关系,不要随便填写
            selects: [{
                //必填:目标
                target: "selector or jQuery",
                //必填:后台请求地址
                remote: {
                    url: "后台请求地址",
                    requestType: "post or get"
                },
                //选填:select表单名
                name: "selectName",
                //选填:select对应的hidden表单名
                hiddenFiled: "hiddenName",
                //选填,参数名称
                paramName: "",
                //选填:依赖的select,可接受数组或者逗号/空格分割字符串
                depends: "paramName",
                //选填:默认值,可接受字符串或对象,字符串表示select表单值
                defaults: {
                    value: ""//select表单默认值
                },
                //选填,数据解析函数
                parse: function(data){}
            }]
            */
        },

        /**
         * 销毁组件
         * @return {[type]} [description]
         */
        destroy: function() {
            var that = this,
                selects = that.config( "selects" );

            //广播销毁事件
            that.trigger( "destroy" );

            that._clearQueue() //清除队列
            ._unbindEventListener(); //清除事件

            //移除注入的自定义属性
            $.each( selects, function( i, select ) {
                select.$target.removeAttr( "data-cascade-index data-cascade-select" );
            } );

            //移除属性
            for ( var prototype in that ) {
                if (hasOwnProperty.call( that, prototype ) ) {
                    that[ prototype ] = null;
                    delete that[ prototype ];
                }
            }

            return that;
        },

        /**
         * 设置级联菜单值
         * @param {[type]} values [description]
         */
        setValue: function( values ) {
            var index,
                select,
                $select,
                $target,
                $options,
                result = [],
                that = this,
                selects = that.config( "selects" );

            $.each( values, function( key, value ) {
                $select = $( "select" + that._selector + "[name=\"" + key + "\"]" );
                if ( $select.length ) {
                    $options = $select.find( "option" );
                    $target = $options.filter( function() {
                        return $( this ).attr( "value" ) === value;
                    } );
                    !$target.length && ( $target = $options.filter( function() {
                        return $( this ).text() === value;
                    } ) );
                    if ( $target.length ) {
                        $options.prop( "selected", false );
                        $target.prop( "selected", true );
                    } else {
                        index = parseInt( $select.attr( "data-cascade-index" ), 10 );
                        select = selects[ index ];
                        result.push( $.extend( select, {
                            index: index,
                            defaultsValue: value
                        } ) );
                        result.sort( function( a, b ) {
                            return a.index - b.index;
                        } );
                    }
                }
            } );
            if ( result.length ) {
                that._queue( [].concat( result ) )._dequeue();
            }
            result = null;

            return that;
        },

        /**
         * 获取所有选中的值
         * @return {[type]} [description]
         */
        getAllValue: function() {
            var result,
                values = [];

            $.each( this.config( "selects" ), function( i, select ) {
                values.push( select.$target.val() );
            } );
            result = $.extend( true, [], values );
            values = null;

            return result;
        },

        /**
         * 获取所有选中文本
         * @return {[type]} [description]
         */
        getAllText: function() {
            var result,
                values = [];

            $.each( this.config( "selects" ), function( i, select ) {
                values.push( select.$target.find( "option:selected" ).text() );
            } );
            result = $.extend( true, [], values );
            values = null;

            return result;
        },

        /**
         * 设置或获取配置
         * @param  {[type]} key  键
         * @param  {[type]} value 值
         * @return {[type]}
         */
        config: function( key, value ) {
            var that = this,
                result = that,
                options = that._options,
                type = $.type( key );

            if ( type === "undefined" ) {

                //获取所有配置信息
                result = $.extend( true, {}, options );
            } else if ( type === "string" ) {
                if ( value === undefined ) {

                    //获取某个配置信息
                    result = options[ key ];
                } else {

                    //设置某个配置信息
                    options[ key ] = value;
                }
            } else if ( type === "object" ) {

                //设置多个配置信息
                $.extend( true, options, key );
            }

            return result;
        },

        /**
         * 添加自定义事件
         * @return {[type]} [description]
         */
        on: function() {
            var that = this,
                events = that._events;

            events.on.apply( events, arguments );
            return that;
        },

        /**
         * 添加只执行一次回调
         * @return {[type]} [description]
         */
        one: function() {
            var that = this,
                events = that._events;

            events.one.apply( events, arguments );
            return that;
        },

        /**
         * 移除自定义事件
         * @return {[type]} [description]
         */
        off: function() {
            var that = this,
                events = that._events;

            events.off.apply( events, arguments );
            return that;
        },

        /**
         * 触发自定义事件
         * @return {[type]} [description]
         */
        trigger: function() {
            var that = this,
                events = that._events;

            events.trigger.apply( events, arguments );
            return that;
        },

        /**
         * 载入数据
         * @return {[type]} [description]
         */
        load: function() {
            var that = this;
            that._dequeue();
            return that;
        },

        /**
         * 是否已初始化
         * @return {Boolean} [description]
         */
        isInited: function() {
            return this._isInited;
        },

        /**
         * 初始化
         * @param  {[type]} options 配置对象
         * @return {[type]}
         */
        _init: function( options ) {
            var that = this;

            that._initParam( options )
                ._initConfig()
                ._initQueue()
                ._bindEventListener();

            if ( that.config( "autoLoad" ) ) {
                that.load();
            }
        },

        /**
         * 绑定事件
         * @return {[type]} [description]
         */
        _bindEventListener: function() {
            var that = this;

            $document
                .on( "change.cascade", that._selector, function( e ) {
                    that._eventCallbacs.selectChange.call( that, e, $( this ) );
                } );

            return that;
        },

        /**
         * 清除事件
         * @return {[type]} [description]
         */
        _unbindEventListener: function() {
            var that = this;

            that.off(); //清除所有自定义事件
            $document.off( "change.cascade", that._selector );

            return that;
        },

        /**
         * 事件回调
         * @type {Object}
         */
        _eventCallbacs: {
            /**
             * select的change事件
             * @param  {[type]} event   [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            selectChange: function( event, $target ) {
                var that = this,
                    index = parseInt( $target.attr( "data-cascade-index" ), 10 ),
                    target = that.config( "selects" )[ index ],
                    selects = that.config( "selects" ).slice( index + 1 );

                $.each( selects, function( i, select ) {
                    select.defaultsValue = ""; //默认值清空
                    select.$hidden && select.$hidden.val( "" ); //hidden表单值清空
                } );
                target.$hidden && target.$hidden.val( $.trim( $target.find( "option:selected" ).text() ) );

                that._queue( selects ); //入队
                that._dequeue(); //出队
            }
        },

        /**
         * 抛异常
         * @param  {[type]} msg 异常信息
         * @return {[type]}     [description]
         */
        _throwError: function( msg ) {
            $.error( "CascadeSelect " + ( msg || "抛出异常" ) );
        },

        /**
         * 初始化必要参数
         * @return {[type]} [description]
         */
        _initParam: function( options ) {
            var that = this;

            that._isInited = false; //是否已初始化
            that._options = $.extend( true, {}, that.options, options );
            that._events = that._queueList = $( {} );

            return that;
        },

        /**
         * 初始化配置信息
         * @return {[type]} [description]
         */
        _initConfig: function() {
            var that = this,
                selects = that.config( "selects" ) || [];

            if ( !selects || !selects.length ) {
                that._throwError( "selects配置项必须是非空数组" );
            }
            that._uuid = $.cowboy.GUID++;

            //解析select名称
            var parseName = function( selects, select) {
                if ( !select.name ) {
                    select.name = select.$target.attr( "name" );
                }
                if ( !select.parse ) {
                    if ( that.config( "parse" ) ) {
                        select.parse = that.config( "parse" );
                    }
                }
                selects = select = null;
            };

            //解析目标
            var parseTarget = function( selects, select, i ) {
                var target = select.target;

                that._selector = "[data-cascade-select=\"" + that._uuid + "\"]";
                select.$target = target.jquery ? target : $( target );
                select.$target.attr( {
                    "data-cascade-index": i,
                    "data-cascade-select": that._uuid
                } );
                selects = select = target = null;
            };

            //解析remote
            var parseRemote = function( selects, select) {
                var type,
                    config,
                    commonType,
                    commonConfig,
                    remote = select.remote,
                    commonRemote = that.config( "remote" );

                if ( !select.local ) {
                    type = $.type( remote );
                    if ( type === "string" ) {
                        config = {
                            url: select.remote
                        };
                    } else if ( type === "object" ) {
                        config = {
                            url: select.remote.url,
                            requestType: select.remote.requestType
                        };
                    } else {
                        that._throwError( "select的remote配置项不能为空" );
                    }
                    commonType = $.type( commonRemote );
                    if ( commonType === "string" ) {
                        commonConfig = {
                            url: commonRemote
                        };
                    } else if ( commonType === "object" ) {
                        commonConfig = {
                            url: commonRemote.url,
                            requestType: commonRemote.requestType
                        };
                    }
                    $.extend( select, commonConfig, config );
                    select.requestType = select.requestType || "post";
                }
            };

            //解析依赖关系
            var parseDepends = function( selects, select, i ) {
                var depends = select.depends;
                if ( depends ) {
                    if ( !$.isArray() ) {
                        depends = ( depends || "" ).split( /[\,|\s+]/ );
                    }
                } else {
                    depends = Util.generateDepends( selects, select, i );
                }
                select.depends = depends;
                selects = select = null;
            };

            //解析隐藏域
            var parseHiddenFiled = function( selects, select) {
                var $hidden,
                    paramName,
                    $target = select.$target,
                    hiddenFiled = select.hiddenFiled;

                if ( hiddenFiled ) {
                    $hidden = $target.parent().find( "input:hidden[name=\"" + hiddenFiled + "\"]" );
                    if ( !$hidden.length ) {
                        $hidden = $( Mustache.render( TEMPLATE.hidden, {
                            name: hiddenFiled
                        } ) ).insertAfter( $target );
                    }
                    select.$hidden = $hidden;
                    paramName = $hidden.attr( "name" );
                } else {
                    paramName = select.name;
                }
                if ( !select.paramName ) {
                    select.paramName = paramName;
                }
                $target = $hidden = selects = select = null;
            };

            //解析默认值
            var parseDefaultValue = function( selects, select) {
                var type,
                    defaultsValue = select.defaultsValue;

                if ( defaultsValue ) {
                    type = $.type( defaultsValue );
                    if ( type === "string" ) {
                        select.defaultsValue = defaultsValue;
                    } else if ( type === "object" ) {
                        select.defaultsValue = defaultsValue.value || "";
                    }
                }
            };

            //移除不必要的配置
            var deleteUnUsedConfig = function( selects, select) {
                $.each( [
                    "name",
                    "target",
                    "remote",
                    "hiddenFiled"
                ], function( i, name ) {
                    select[ name ] = null;
                    delete select[ name ];
                } );
            };
            $.each( selects, function( i, select ) {
                var options = that.options;

                //执行顺序不能调换
                $.each( [
                    parseTarget,
                    parseName,
                    parseRemote,
                    parseDepends,
                    parseDefaultValue,
                    parseHiddenFiled,
                    deleteUnUsedConfig
                ], function() {
                    this.call( null, selects, select, i );
                } );
                $.each( [
                    "parse",
                    "remote"
                ], function( i, name ) {
                    options[ name ] = null;
                    delete options[ name ];
                } );
                options = null;
            } );
            that._paramNameMap = Util.list2Map( "paramName", selects, "$target" );

            return that;
        },

        /**
         * 初始化队列
         * @return {[type]} [description]
         */
        _initQueue: function() {
            var that = this;

            that._queue( that.config( "selects" ) );
            that._queueList.queue( "cascade", function( next ) {
                that._isInited = true; //已初始化
                next();
            } );

            return that;
        },

        /**
         * 生成下拉菜单项
         * @param  {[type]} selectConfig [description]
         * @param  {[type]} html         [description]
         * @return {[type]}              [description]
         */
        _generateSelectOptions: function( selectConfig, html ) {
            var $options,
                hiddenValue,
                that = this,
                $selectedOption,
                $target = selectConfig.$target,
                defaultsValue = selectConfig.defaultsValue;

            if ( html ) {
                $target.html( html );
                $options = $target.children();
                if ( defaultsValue ) {
                    $selectedOption = $options.filter( function() {
                        return this.value === defaultsValue;
                    } );
                    !$selectedOption.length && ( $selectedOption = $options.filter( function() {
                        return $( this ).text() === defaultsValue;
                    } ) );
                } else {
                    $selectedOption = $options.first();
                }
                $selectedOption.prop( "selected", true ); //设置选中项
                hiddenValue = $.trim( $selectedOption.text() ); //获取表单域值
            } else {
                $target.html( "<option value=\"\">没有数据</option>" );
                hiddenValue = "";
            }
            if ( selectConfig.$hidden ) {
                selectConfig.$hidden.val( hiddenValue );
            }
            selectConfig.defaultsValue = ""; //默认值置空

            return that;
        },

        /**
         * 生成队列
         * @return {[type]} [description]
         */
        _queue: function( selects ) {
            var that = this,
                queueList = that._queueList;

            that._clearQueue(); //清空队列
            $.each( selects, function( i, select ) {
                queueList.queue( "cascade", function( next ) {
                    var param,
                        html = TEMPLATE.emptyOption,
                        isGet = select.requestType === "get",
                        generateHtml = function( result ) {
                            if ( select.parse ) {
                                result = select.parse( result );
                            }
                            if ( result ) {
                                html = Mustache.render( select.tpl || TEMPLATE.options, {
                                    options: result.data
                                } );
                            }
                        };
                    if ( select.local ) {

                        //读取本地数据
                        generateHtml( select.local );
                        that._generateSelectOptions( select, html );
                        that.trigger( "selectload", select.$target[ 0 ] );
                        next();
                        select = html = null;
                    } else {
                        param = Util.generateParams( that._paramNameMap, select );

                        //读取远程数据
                        select.promise = $[ isGet ? "get" : "post" ]( select.url, param ).done( function( result ) {
                            generateHtml( result );
                        } ).always( function() {
                            that._generateSelectOptions( select, html );
                            that.trigger( "selectload", select.$target[ 0 ] );
                            next();
                            select = html = null;
                        } );
                    }
                } );
            } );
            queueList.queue( "cascade", function( next ) {
                that.trigger( "loaded" ); //广播数据载入完成
                next();
            } );
            selects = queueList = null;

            return that;
        },

        /**
         * 出队
         * @return {[type]} [description]
         */
        _dequeue: function() {
            var that = this;
            that._queueList.dequeue( "cascade" );
            return that;
        },

        /**
         * 清空队列
         * @return {[type]} [description]
         */
        _clearQueue: function() {
            var that = this;

            that._queueList.clearQueue( "cascade" ); //清空队列
            $.each( that.config( "selects" ), function( i, select ) {
                if ( select.promise ) {
                    select.promise.abort(); //终止请求后台
                    select.promise = null;
                }
            } );

            return that;
        }
    } );
    prototypeFn._init.prototype = prototypeFn;

    $.cowboy.plugin( CascadeSelect ); //暴露组件并转成jQuery插件
} ) );
