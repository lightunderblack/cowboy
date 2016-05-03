( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
    var fullName = "area-selector";

    if ( $.cowboy.isPluginExisten( $.camelCase( fullName ) ) ) {
        return;
    }

    var document = window.document,
        hasOwnProperty = ( {} ).hasOwnProperty;

    //前缀名称
    var PREFIX = "area-selector";

    //支持键盘导航的键值
    var KEY_CODE = {
        up: 38, //向上
        down: 40 //向下
    };
    var KEY_BORAD_NAV = {};
    KEY_BORAD_NAV[ KEY_CODE.up ] = 1;
    KEY_BORAD_NAV[ KEY_CODE.down ] = 1;

    //延时时间
    var DELAY_TIME = {
        SEARCH: 300,
        HIDE_INPUT_BOX: 200,
        RESET_POSITION: 100
    };

    //最大高度
    var MAX_HEIGHT = 250;

    //特殊值
    var SPECIAL_CODES = {
        "330281": 1,
        "44060011": 1
    };

    //样式类名集合
    var CLASS_NAME = {
        ACTIVE_CLASS_NAME: "active",//下拉菜单选中样式
        DISABLED_CLASS_NAME: "disabled"//菜单选项不可用
    };

    //模板
    var TEMPLATE = {
        hiddenFiled: '<input type="hidden" />',
        dropDownMenu: '<ul class="area-selector-dropdown-menu"></ul>',
        menuEmpty: '<li class="disabled"><a href="#">{{text}}</a></li>',
        menuItem: '{{#list}}<li data-value="{{value}}"><a href="#">{{city}}-{{country}}</a></li>{{/list}}',
        cityNav: '{{#data}}<li class="fl" data-target="{{name}}">{{name}}</li>{{/data}}',
        cityTabs: [
            "{{#data}}",
                '<div class="pop-tab" data-target="{{name}}">',
                    '<ul class="area-selector-value area-selector-pop-city-list clearfix">',
                        "{{#value}}",
                            '<li class="fl area-selector-item" data-id="{{value}}" data-name="{{name}}" data-role="selectCity"><a href="#">{{name}}</a></li>',
                        "{{/value}}",
                        "{{#children}}",
                            "<li>",
                                '<ul class="area-selector-value area-selector-value-w clearfix">',
                                    '<li class="fl area-selector-value-h"><h3>{{name}}</h3></li>',
                                    '<li class="area-selector-value-b">',
                                        '<ul class="area-selector-value clearfix">',
                                            "{{#value}}",
                                                '<li class="fl area-selector-item" data-id="{{value}}" data-name="{{name}}" data-role="selectCity"><a href="#">{{name}}</a></li>',
                                            "{{/value}}",
                                        "</ul>",
                                    "</li>",
                                "</ul>",
                            "</li>",
                        "{{/children}}",
                    "</ul>",
                "</div>",
            "{{/data}}"
        ].join( "" ),
        emptyCountry: '<li class="disabled empty-data">没有数据</li>',
        countryItem: [ '{{#data}}<li class="fl area-selector-item" data-id="{{value}}" data-name="{{name}}" data-role="selectCountry"><a href="#">{{name}}</a></li>{{/data}}' ].join( "" ),
        areaSelectorPop: [
            '<div class="area-selector-pop">',
                '<div class="area-selector-pop-header">支持文字输入<a href="#" class="close" data-action="hideAreaSelectorPop">×</a></div>',
                '<div class="area-selector-pop-body">',
                    '<ul class="selector-pop-nav area-selector-pop-nav clearfix">',
                        '<li class="fl active" data-target="city">城市</li>',
                        '<li class="fl" data-target="country">区县</li>',
                    "</ul>",
                    '<div class="pop-tabs area-selector-pop-tabs">',
                        '<div class="pop-tab" data-target="city">',
                            '<ul class="selector-pop-nav area-selector-pop-city-nav clearfix">',
                            "</ul>",
                            '<div class="pop-tabs area-selector-pop-city-tabs">',
                            "</div>",
                        "</div>",
                        '<div class="pop-tab" data-target="country">',
                            '<ul class="area-selector-value area-selector-pop-country-list clearfix"></ul>',
                        "</div>",
                    "</div>",
                "</div>",
            "</div>"
        ].join( "" )
    };

    var PLUGIN_DATA_NAME = "area-selector-plugin";

    //计时器
    var TIMERS = {
        searchTimer: null,
        hideDropdownMenuTimer: null,
        resetPositionTimer: null
    };

    //Promise对象集合
    var PROMISE = {
        getCityPromise: null,
        getCountryPromise: null,
        searchPromise: null
    };

    //注入样式
    var styles = [
        "<style>",
            ".area-selector-dropdown-menu{position: absolute; top: 100%; left: 0; z-index: 1000; display: none; float: left; min-width: 160px; list-style: none; background-color: #fff; border: 1px solid #ccc; padding: 0; margin:1px 0 0; min-height:32px; overflow: hidden; overflow-y: auto;}",
            ".area-selector-dropdown-menu li a{display: block; padding:6px 14px; clear: both; font-weight: normal; line-height: 20px; color: #333; white-space: nowrap}",
            ".area-selector-dropdown-menu li a:hover, .area-selector-dropdown-menu li a:focus{color: #fff; text-decoration: none; background-color: #3399EE;}",
            ".area-selector-dropdown-menu .active a, .area-selector-dropdown-menu .active a:hover, .area-selector-dropdown-menu .active a:focus{color: #fff; text-decoration: none; background-color: #3399EE; outline: 0;}",
            ".area-selector-dropdown-menu .disabled a, .area-selector-dropdown-menu .disabled a:hover, .area-selector-dropdown-menu .disabled a:focus{color: #999}",
            ".area-selector-dropdown-menu .disabled a:hover, .area-selector-dropdown-menu .disabled a:focus{text-decoration: none; cursor: default; background-color: transparent;}",
            ".area-selector-pop{display: none; border: 1px solid #999; background: #FFF; padding: 8px 0; width: 408px; position: absolute;}",
            ".area-selector-pop ul{list-style: none; margin: 0; padding: 0;}",
            ".area-selector-pop a{text-decoration: none;}",
            ".area-selector-pop-header{padding: 0 13px; color: #999; position: relative; font-size: 12px;}",
            ".area-selector-pop-header a{font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #999; text-decoration: none; font-size: 20px; line-height: 20px; position: absolute; top: -2px; right: 8px; cursor: pointer;}",
            ".area-selector-pop-header a:hover{color: #666}",
            ".area-selector-pop-body{padding: 18px 0 10px;}",
            ".area-selector-pop .area-selector-pop-nav{padding: 0 13px 14px;}",
            ".area-selector-pop-nav li{width: 50%; background: #e3e3e3; color: #999; height: 30px; line-height: 30px; text-align: center; cursor: pointer;}",
            ".area-selector-pop-nav .active{background: #3295e8; color: #FFF; cursor: default;}",
            ".pop-tab{display: none;}",
            ".pop-tabs .active{display: block;}",
            ".area-selector-pop-city-nav{border-bottom: 2px solid #e9e9e9; font-size: 14px;}",
            ".area-selector-pop .area-selector-pop-city-nav{margin-bottom: 12px;}",
            ".area-selector-pop-city-nav li{margin: 0 13px; color: #0088dd; line-height: 2em; margin-bottom: -2px; cursor: pointer;}",
            ".area-selector-pop-city-nav .active{border-bottom: 2px solid #0088dd; color: #3193e5; font-weight: bold; cursor: default;}",
            ".area-selector-value .area-selector-item{padding: 6px 0 6px 20px; display: block; }",
            ".area-selector-value .area-selector-item a{display: block;white-space:nowrap}",
            ".area-selector-value li{font-size: 12px;}",
            ".area-selector-value a{color: #333;}",
            ".area-selector-pop .area-selector-value-w{padding: 0 14px;}",
            ".area-selector-value-h{padding: 6px 0 6px 0; font-weight: bold;}",
            ".area-selector-value-b{padding: 0 0 0 10px;}",
            ".area-selector-value a:hover, .area-selector-value .active a{color: #0066ff;}",
            ".area-selector-value .active a{cursor: default;}",
            ".area-selector-pop .empty-data{text-align: center;}",
            ".area-selector-pop .area-selector-pop-country-list{padding-right: 14px;}",
        "</style>"
    ].join( "" );
    $( "head", document ).append( styles );

    var AreaSelector = function( options ) {
        return new AreaSelector.prototype._init( options );
    };
    var prototypeFn = AreaSelector.prototype;
    $.extend( prototypeFn, {
        fullName: fullName,

        //默认配置项
        options: {
            target: null,//必填,可传selector或jQuery对象
            disabled: true,//默认组件可用
            //必填,搜索有关配置项
            remote: {

                //搜索请求地址
                url: {
                    getCity: "",//获取城市数据
                    searchCity: "",//搜索
                    getCountry: ""//获取区/县数据
                },
                requestType: "get",
                paramName: "keyWord", //参数名称
                parse: function( data ) {
                    return { data: data };//结果数据的预处理函数,不同的后台返回的数据格式不同,该函数可以实现数据格式及字段一致
                }
            },
            hiddenFiled: null,//选填,是否需要添加hidden表单 i.e.{name:"companyId"}
            selectedCallback: null//选填,选中搜索结果项回调函数
        },

        /**
         * 销毁组件,释放内存
         * @return {[type]} [description]
         */
        destroy: function() {
            var that = this;

            that._clearTimer()//清除所有计时器
                ._abortPromise();//清除所有异步请求

            //移除当前命名空间下所有事件
            $( document )
                .off( "." + that._containerId )
                .off( "." + PREFIX );
            that._$areaSelectorPop
                .off( "." + that._containerId )
                .off( "." + PREFIX );
            that._$dropdownMenu.off( "." + PREFIX );
            $( window ).off( "." + PREFIX );
            that._events.off();
            that._revertBack();

            for ( var property in that ) {

                //移除属性
                if (hasOwnProperty.call( that, property ) ) {
                    that[ property ] = null;
                    delete that[ property ];
                }
            }

            return that;
        },

        /**
         * 设置组件不可用
         * @return {[type]} [description]
         */
        disable: function() {
            var that = this;

            that._disbled = true;
            that._$targetInput.prop( {
                disabled: true
            } );

            return that;
        },

        /**
         * 设置组件可用
         * @return {[type]} [description]
         */
        enable: function() {
            var that = this;

            that._disbled = false;
            that._$targetInput.prop( {
                disabled: false
            } );

            return that;
        },

        /**
         * 获取文本输入框jQuery对象
         * @return {[type]} [description]
         */
        getInput: function() {
            return this._$targetInput;
        },

        /**
         * 获取文本隐藏域jQuery对象
         * @return {[type]} [description]
         */
        getHiddenFiled: function() {
            return this._$hiddenFiled;
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
         * 初始化
         * @param  {[type]} options 配置参数
         * @return {[type]}
         */
        _init: function( options ) {
            var that = this;
            that._options = $.extend( true, {}, that.options, options );
            that._cacheParam()
                ._initComponent()
                ._bindEventListener();
        },

        /**
         * 初始化组件
         * @return {[type]} [description]
         */
        _initComponent: function() {
            var id,
                $target,
                that = this,
                target = that._target;

            if ( target.jquery ) {
                $target = target;
            } else {
                $target = $( target );
            }
            if ( !$target || !$target.length ) {
                $.error( "初始化时，请传入$target参数" );
            } else {
                that._containerId = id = PREFIX + "-" + ( $.cowboy.GUID++ );
                that._$targetInput = $target.addClass( "auto-complete-target auto-complete-target-" + id ).attr( {
                    "data-idpx": id,
                    autocomplete: "off"
                } );
                that._createAreaSelectorPop()
                    ._createDropDownMenu()
                    ._createHiddenFiled();
            }

            return that;
        },

        /**
         * 还原input框
         * @return {[type]} [description]
         */
        _revertBack: function() {
            var that = this,
                $targetInput = that._$targetInput;

            $targetInput.removeClass( "auto-complete-target" ).removeAttr( "data-idpx" );

            return that;
        },

        /**
         * 设置下拉菜单位置
         */
        _setPosition: function( $target ) {
            var that = this,
                $targetInput = that._$targetInput,
                inputOffset = $targetInput.offset();

            ( $target || that._$dropdownMenu ).css( {
                "left": inputOffset.left + "px",
                "min-width": $targetInput.outerWidth() + "px",
                "top": ( $targetInput.outerHeight() + inputOffset.top ) + "px"
            } );

            return that;
        },

        /**
         * 生成hidden表单域
         * @return {[type]} [description]
         */
        _createHiddenFiled: function() {
            var hiddenName,
                $hiddenFiled,
                that = this,
                hiddenConfig = that._hiddenFiled;

            if ( hiddenConfig && ( hiddenName = $.trim( hiddenConfig.name ) ) ) {
                $hiddenFiled = that._$targetInput.closest( "form" ).find( 'input:hidden[name="' + hiddenName + '"]' );
                if ( !$hiddenFiled.length ) {
                    $hiddenFiled = $( TEMPLATE.hiddenFiled ).attr( {
                        name: hiddenName
                    } );
                    that._$targetInput.after( $hiddenFiled );
                }
                that._$hiddenFiled = $hiddenFiled;
            }

            return that;
        },

        /**
         * 生成地区选择弹框
         */
        _createAreaSelectorPop: function() {
            var that = this,
                $areaSelectorPop;

            $areaSelectorPop = that._$areaSelectorPop = that._$body.find( ".area-selector-pop" );
            if ( !$areaSelectorPop.length ) {
                that._abortPromise( "getCityPromise" );
                that._abortPromise( "getCountryPromise" );
                $areaSelectorPop = that._$areaSelectorPop = $( TEMPLATE.areaSelectorPop ).appendTo( that._$body );
                PROMISE.getCityPromise = $.getScript( that._remote.url.getCity ).done( function() {
                    var res,
                        children,
                        result = {},
                        results = [];

                    res = _CITY_DATA;
                    results.push( {
                        name: "周边城市",
                        value: res[ "周边城市" ] || []
                    } );
                    res[ "周边城市" ] = null;
                    delete res[ "周边城市" ];
                    $.each( res, function( key, value ) {
                        result = {};
                        children = [];
                        result.name = key;
                        $.each( value, function( key, value ) {
                            children.push( $.extend( true, {}, {
                                name: key,
                                value: value
                            } ) );
                        } );
                        result.children = children;
                        results.push( result );
                    } );
                    that._$areaSelectorPopCityNav.html( Mustache.render( TEMPLATE.cityNav, {
                        data: results
                    } ) );
                    that._$areaSelectorPopCityTabs.html( Mustache.render( TEMPLATE.cityTabs, {
                        data: results
                    } ) );
                } ).fail( function( jqXHR, textStatus ) {
                    if ( textStatus !== "abort" ) {
                    }
                } ).always( function() {
                    PROMISE.getCityPromise = null;
                } );
            }
            $areaSelectorPop.attr( "data-idpx", that._containerId );
            $.each( [
                ".area-selector-pop-city-nav",
                ".area-selector-pop-city-tabs",
                ".area-selector-pop-country-list"
            ], function( i, item ) {
                that[ "_$" + $.camelCase( item.replace( /\#|\./g, "" ) ) ] = $( item );
            } );

            return that;
        },

        /**
         * 生成下拉菜单
         */
        _createDropDownMenu: function() {
            var that = this,
                $dropDownMenu;

            $dropDownMenu = that._$dropdownMenu = that._$body.find( ".area-selector-dropdown-menu" );
            if ( !$dropDownMenu.length ) {
                $dropDownMenu = that._$dropdownMenu = $( TEMPLATE.dropDownMenu ).appendTo( that._$body );
            }
            $dropDownMenu.attr( "data-idpx", that._containerId );

            return that;
        },

        /**
         * 缓存常用参数
         */
        _cacheParam: function() {
            var property,
                that = this,
                options = that._options;

            for ( property in options ) {
                that[ "_" + property ] = options[ property ];
            }
            that._events = $( {} );
            that._$body = $( document.body );

            return that;
        },

        /**
         * 绑定事件
         */
        _bindEventListener: function() {
            var that = this,
                selector = that._containerId,
                targetInput = ".auto-complete-target-" + selector,
                eventCallbacks = that._eventCallbacks;

            $( document )
                .off( "click." + PREFIX )//得先移除再绑定
                .on( "click." + PREFIX, function( e ) {
                    eventCallbacks.clickOthers.call( that, e, $( e.target ) );
                } )
                .on( "keydown." + selector, targetInput, function( e ) {
                    eventCallbacks.keydownInputbox.call( that, e, $( this ) );
                } )
                .on( "focusin." + selector, targetInput, function( e ) {
                    eventCallbacks.showAreaSelectorPop.call( that, e, $( this ) );
                } )
                .on( "keyup." + selector, targetInput, function( e ) {
                    eventCallbacks.changeInputBox.call( that, e, $( this ) );
                } );

            that._$dropdownMenu
                .off( "." + PREFIX )//得先移除再绑定
                .on( "click." + PREFIX, "li", function( e ) {
                    eventCallbacks.clickDropdownMenuItem.call( that, e, $( this ) );
                } );

            that._$areaSelectorPop
                .off( "." + PREFIX )//得先移除再绑定
                .on( "click." + PREFIX, ".selector-pop-nav li", function( e ) {
                    eventCallbacks.selectTabNav.call( that, e, $( this ) );
                } )
                .on( "click." + PREFIX, ".area-selector-item", function( e ) {
                    eventCallbacks.selectPopItem.call( that, e, $( this ) );
                } )
                .on( "click." + PREFIX, "[data-action]", function( e ) {
                    var $target = $( this ),
                        action = $.trim( $target.data( "action" ) );

                    if ( eventCallbacks[ action ] &&
                        !$target.data( "pending" ) &&
                            !$target.prop( "disabled" ) &&
                                !$target.hasClass( "disabled" ) ) {
                        eventCallbacks[ action ].call( that, e, $( this ) );
                    }
                    e.preventDefault();
                } );

            $( window )
                .off( "." + PREFIX )
                .on( "resize." + PREFIX, function( e ) {
                    eventCallbacks.resetPosition.call( that, e, $( this ) );
                } );

            return that;
        },

        /**
         * 选中搜索下拉项
         */
        _selectResult: function( value, $target ) {
            var that = this,
                instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop ),
                data = instance._cacheData[ $target.closest( "ul" ).children().index( $target ) ];

            instance._$targetInput.val( value.text ).attr( "data-idv", value.value );//标识选中
            if ( instance._$hiddenFiled ) {

                //若有hidden表单域则设置值
                instance._$hiddenFiled.val( value.value );
            }
            if ( instance._selectedCallback ) {
                instance._selectedCallback( value, instance, data );
            }
            instance.trigger( "selected", [ value, instance, data ] );
            instance = null;

            return that;
        },

        /**
         * 通过data-idpx属性值获取AreaSelector实例
         */
        _getAreaSelectorInstanceByIdx: function( $target ) {
            return $( ".area-selector[data-idpx=\"" + $.trim( $target.attr( "data-idpx" ) ) + "\"]" ).data( PLUGIN_DATA_NAME );
        },

        /**
         * 回车键选中搜索下拉项
         */
        _keyDownToSelectResult: function() {
            var that = this,
                instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );

            if ( that._isSearchNoEmpty() ) {
                instance._$targetInput.blur();
                instance._eventCallbacks.focusoutInputBox.call( instance );
            }
            instance = null;

            return that;
        },

        /**
         * 键盘导航
         * @param  {[type]} keyCode
         * @return {[type]}
         */
        _keyBoardNavigate: function( keyCode, e ) {
            var isUp,
                $current,
                that = this,
                $dropdownMenu,
                $dropdownMenuItems;

            if ( KEY_BORAD_NAV[ keyCode ] && that._isSearchNoEmpty() ) {
                isUp = KEY_CODE.up === keyCode;
                $dropdownMenu = that._$dropdownMenu;
                $dropdownMenuItems = that._$dropdownMenu.children();
                $current = $dropdownMenu.find( "." + CLASS_NAME.ACTIVE_CLASS_NAME );
                if ( $current.length ) {
                    $current.removeClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    if ( isUp ) {
                        $current = $current.prev();
                        while ( $current.length && $current.hasClass( CLASS_NAME.DISABLED_CLASS_NAME ) ) {
                            $current = $current.prev();
                        }
                    } else {
                        $current = $current.next();
                        while ( $current.length && $current.hasClass( CLASS_NAME.DISABLED_CLASS_NAME ) ) {
                            $current = $current.next();
                        }
                    }
                } else {
                    $current = $dropdownMenu.children().not( "." + CLASS_NAME.DISABLED_CLASS_NAME ).first();
                }
                if ( $current.length ) {
                    $current.addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    that._scrollIntoView( $current );
                }
                e.preventDefault();
            }

            return that;
        },

        /**
         * 键盘导航时设置滚动条位置
         * @param  {[type]} item [description]
         * @return {[type]}      [description]
         */
        _scrollIntoView: function( item ) {
            var offset,
                scroll,
                itemHeight,
                that = this,
                elementHeight,
                $dropdownMenu = that._$dropdownMenu;

            if ( that._hasScroll() ) {
                offset = item.offset().top - $dropdownMenu.offset().top;
                scroll = $dropdownMenu.scrollTop();
                elementHeight = $dropdownMenu.height();
                itemHeight = item.outerHeight();
                if ( offset < 0 ) {
                    $dropdownMenu.scrollTop( scroll + offset );
                } else if ( offset + itemHeight > elementHeight ) {
                    $dropdownMenu.scrollTop( scroll + offset - elementHeight + itemHeight );
                }
            }

            return that;
        },

        /**
         * 判断是否有滚动条
         * @return {Boolean} [description]
         */
        _hasScroll: function() {
            var $dropdownMenu = this._$dropdownMenu;
            return $dropdownMenu.outerHeight() < $dropdownMenu.prop( "scrollHeight" );
        },

        /**
         * 执行搜索
         * @param  {[type]} keyword 关键字
         * @return {[type]}
         */
        _toSeach: function( keyword ) {
            var that = this;

            that._clearTimer( "searchTimer" )
                ._abortPromise( "searchPromise" );

            if ( keyword ) {
                TIMERS.searchTimer = setTimeout( function() {
                    that._search( keyword );
                }, DELAY_TIME.SEARCH );
            } else {
                that._$dropdownMenu.html( "" ).hide();
            }

            return that;
        },

        /**
         * 搜索
         * @param  {[type]} keyword 关键字
         * @return {[type]}
         */
        _search: function( keyword ) {
            var modal,
                that = this,
                params = {},
                instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop ),
                remote = instance._remote,
                tpl = TEMPLATE.menuEmpty;

            params[ remote.paramName ] = keyword;
            PROMISE.searchPromise = $.getJSON( remote.url.searchCity + "?callback=?", params );
            PROMISE.searchPromise
                .done( function( result ) {
                    var data;

                    if ( $.type( remote.parse ) === "function" ) {
                        result = remote.parse( result );
                    }
                    if ( ( data = result.data ) && data.length ) {
                        tpl = remote.tpl || TEMPLATE.menuItem;
                        modal = {
                            list: data
                        };
                    } else {
                        modal = {
                            text: "没有找到匹配的内容"
                        };
                    }

                    instance._cacheData = data || null;//缓存搜索数据
                } )
                .fail( function( jqXHR, textStatus ) {
                    if ( textStatus !== "abort" ) {
                        modal = {
                            text: "搜索失败，请稍后重试"
                        };
                    }
                    instance._cacheData = null;
                } )
                .always( function() {
                    instance._renderDropdownMenu( tpl, modal );
                    PROMISE.searchPromise = modal = remote = tpl = instance = null;
                } );

            return that;
        },

        /**
         * 搜索结果是否失败或为空
         * @return {Boolean} [description]
         */
        _isSearchNoEmpty: function() {
            var $dropdownMenu = this._$dropdownMenu;
            return !!$dropdownMenu.children().not( "." + CLASS_NAME.DISABLED_CLASS_NAME ).length;
        },

        /**
         * 渲染下拉菜单
         * @param  {[type]} tpl   模板
         * @param  {[type]} modal 数据
         * @return {[type]}
         */
        _renderDropdownMenu: function( tpl, modal ) {
            var length,
                height,
                that = this,
                $dropdownItems,
                $dropdownMenu = that._$dropdownMenu,
                instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );

            if ( modal ) {
                $dropdownMenu.html( Mustache.render( tpl, modal ) );
                $dropdownItems = $dropdownMenu.find( "li" ).not( "." + CLASS_NAME.DISABLED_CLASS_NAME );
                instance._setPosition( $dropdownMenu );
                $dropdownMenu.show();
                if ( ( height = that._getDropdownMenuHeight() ) > MAX_HEIGHT ) {
                    height = MAX_HEIGHT;
                }
                $dropdownMenu.height( height );
                if ( length === 1 ) {
                    $dropdownItems.addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                }
            }else {
                instance._hideDropdownMenu( 0, null, false );
            }

            instance = null;

            return that;
        },

        /**
         * 获取下拉菜单高度
         * @return {[type]} [description]
         */
        _getDropdownMenuHeight: function() {
            var height = 0;

            this._$dropdownMenu.children().each( function() {
                height += $( this ).outerHeight( true );
            } );

            return height;
        },

        /**
         * 隐藏下拉菜单
         * @param  {[type]} delay 延时时长
         */
        _hideDropdownMenu: function( delay, excuteFunc, clear ) {
            var that = this,
                hide = function() {
                    var instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );
                    if ( !$.trim( instance._$targetInput.attr( "data-idv" ) ) && ( clear !== false ) ) {
                        instance._$targetInput.val( "" );//清空文本框内容
                    }
                    that._$dropdownMenu.html( "" ).scrollTop( 0 ).hide();
                    instance = null;
                };

            delay = delay || 0;
            that._clearTimer( "hideDropdownMenuTimer" ); //先清空计时器
            if ( delay ) {

                //若传入延时时长大于0则重新设定计时器
                TIMERS.hideDropdownMenuTimer = setTimeout( function() {
                    excuteFunc && excuteFunc.call( that );
                    hide();
                }, delay );
            } else {
                hide(); //否则直接隐藏
            }

            return that;
        },

        /**
         * 清除计时器
         * @return {[name]} [description]
         */
        _clearTimer: function( name ) {
            var that = this;

            if ( name != null && TIMERS[ name ] ) {
                clearTimeout( TIMERS[ name ] );
                TIMERS[ name ] = null;
            }else if ( name == null ) {
                $.each( TIMERS, function( key ) {
                    if ( TIMERS[ key ] ) {
                        clearTimeout( TIMERS[ key ] );
                        TIMERS[ key ] = null;
                    }
                } );
            }

            return that;
        },

        /**
         * 终止异步请求
         * @return {[name]} [description]
         */
        _abortPromise: function( name ) {
            var that = this;

            if ( name != null && PROMISE[ name ] ) {
                PROMISE[ name ].abort();
                PROMISE[ name ] = null;
            }else if ( name == null ) {
                $.each( PROMISE, function( key ) {
                    if ( PROMISE[ key ] ) {
                        PROMISE[ key ].abort();
                        PROMISE[ key ] = null;
                    }
                } );
            }

            return that;
        },

        /**
         * 事件处理回调
         * @type {Object}
         */
        _eventCallbacks: {
            /**
             * 点击其他地方
             * @return {[type]} [description]
             */
            clickOthers: function( e, $target ) {
                var that = this,
                    instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );

                if ( $target[ 0 ] !== instance.getInput()[ 0 ] &&
                        !$target.closest( ".area-selector-pop" ).length &&
                            !$target.closest( ".area-selector-dropdown-menu" ).length ) {

                    //点击其他地方则直接隐藏下拉菜单/地区选择浮框
                    that._hideDropdownMenu( 0 );
                    that._eventCallbacks.hideAreaSelectorPop.call( that );
                }

                instance = null;
            },

            /**
             * 输入框失去焦点事件处理
             * @return {[type]} [description]
             */
            focusoutInputBox: function() {
                var that = this;

                that._hideDropdownMenu( DELAY_TIME.HIDE_INPUT_BOX, function() {
                    this._$dropdownMenu.find( "." + CLASS_NAME.ACTIVE_CLASS_NAME ).click();
                } );
            },

            /**
             * 输入框按钮事件回调
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            keydownInputbox: function( e, $target ) {
                var keyCode = e.keyCode;

                if ( keyCode === 13 ) {

                    //回车键(13)表示选中
                    this._keyDownToSelectResult();
                    e.preventDefault(); //阻止回车键默认行为
                } else {

                    //键盘导航
                    this._keyBoardNavigate( keyCode, e, $target );
                }
            },

            /**
             * 下拉菜单单击事件处理
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            clickDropdownMenuItem: function( e, $target ) {
                var that = this;

                if ( !$target.hasClass( CLASS_NAME.DISABLED_CLASS_NAME ) ) {
                    that._$dropdownMenu
                        .find( "." + CLASS_NAME.ACTIVE_CLASS_NAME )
                        .removeClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    $target.addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    that._selectResult( {
                        text: $.trim( $target.text() ),
                        value: $.trim( $target.attr( "data-value" ) )
                    }, $target );
                }
                that._hideDropdownMenu( 0 );
                e.preventDefault();
            },

            /**
             * 输入框input事件回调
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            changeInputBox: function( e, $target ) {
                var value,
                    that = this,
                    keyCode = e.keyCode,
                    instance = that._getAreaSelectorInstanceByIdx( $target );

                if ( KEY_BORAD_NAV[ keyCode ] || keyCode === 13 ) {

                    //特殊键盘值不予处理,交给keydownInputbox事件回调处理
                } else {
                    value = $.trim( $target.val() );

                    //与旧值比较,若无变化则不予发送请求
                    if ( instance._oldText !== value ) {
                        instance._oldText = value;//缓存关键字用于后续比较
                        $target.removeAttr( "data-idv" );//需将data-idv标识属性清空
                        if ( instance._$hiddenFiled ) {
                            instance._$hiddenFiled.val( "" );//若有hidden表单则清空值
                        }
                        instance._toSeach( value );
                    }
                }
                that._eventCallbacks.hideAreaSelectorPop.call( that, false );
                instance = null;
            },

            /**
             * 显示地区选择弹层
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            showAreaSelectorPop: function( e, $target ) {
                var instance,
                    that = this,
                    $areaSelectorPop = that._$areaSelectorPop;

                that._hideDropdownMenu( 0, null, false );//隐藏dropdownmenu
                instance = that._getAreaSelectorInstanceByIdx( $areaSelectorPop );
                instance._oldText = "";//清空缓存搜索关键字
                $areaSelectorPop.attr( "data-idpx", $target.attr( "data-idpx" ) );//重新设置data-idpx值,标识当前是哪个输入框
                instance = that._getAreaSelectorInstanceByIdx( $areaSelectorPop );
                instance._setPosition( $areaSelectorPop );//重新设置弹层控件位置
                that._abortPromise( "getCountryPromise" );//终止获取区县请求
                that._$areaSelectorPopCountryList.html( "" );//并且清空区县数据
                instance._cityData = null;//并且将之前缓存的城市数据清空

                //下面的操作是重置弹层界面
                $areaSelectorPop
                    .find( ".selector-pop-nav" ).each( function() {
                        $( this ).children().removeClass( CLASS_NAME.ACTIVE_CLASS_NAME ).first().addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    } )
                .end()
                    .find( ".pop-tabs" ).each( function() {
                        $( this ).children().removeClass( CLASS_NAME.ACTIVE_CLASS_NAME ).first().addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
                    } )
                .end()
                    .show();

                instance = null;
            },

            /**
             * 隐藏地区选择弹层
             * @param  {[type]} clear 标识是否清空输入框内容
             * @return {[type]}       [description]
             */
            hideAreaSelectorPop: function( clear ) {
                var instance,
                    that = this;

                instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );
                if ( !$.trim( instance._$targetInput.attr( "data-idv" ) ) && ( clear !== false ) ) {
                    instance._$targetInput.val( "" );//清空文本框内容
                }
                that._abortPromise( "getCountryPromise" );//终止获取区县请求
                that._$areaSelectorPopCountryList.html( "" );//并且清空区县数据
                instance._cityData = null;//并且将之前缓存的城市数据清空
                that._$areaSelectorPop.hide();
            },

            /**
             * 选中tab
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            selectTabNav: function( e, $target ) {
                var $tab,
                    that = this,
                    activeClassName = CLASS_NAME.ACTIVE_CLASS_NAME,
                    target = $.trim( $target.data( "target" ) );

                if ( !$target.hasClass( activeClassName ) ) {
                    $target
                        .closest( ".selector-pop-nav" ).children().removeClass( activeClassName )
                    .end().end()
                        .addClass( activeClassName );

                    $tab = $( ".pop-tab[data-target=\"" + target + "\"]" );
                    $tab
                        .closest( ".pop-tabs" ).children().removeClass( activeClassName )
                    .end().end()
                        .addClass( activeClassName );

                    if ( target === "city" ) {
                        that._$areaSelectorPopCountryList.html( "" );
                        $( ".selector-pop-nav>li[data-target=\"周边城市\"]" ).click();
                    }
                }
            },

            /**
             * 选中地区单元
             * @param  {[type]} e       [description]
             * @param  {[type]} $target [description]
             * @return {[type]}         [description]
             */
            selectPopItem: function( e, $target ) {
                var that = this,
                    action = $.trim( $target.data( "role" ) );//根据role值调用相应的回调

                that._eventCallbacks[ action ].call( that, $target.data( "name" ), $target.data( "id" ) );
                e.preventDefault();
            },

            /**
             * 选中城市
             * @param  {[type]} name  名称
             * @param  {[type]} value code值
             * @return {[type]}       [description]
             */
            selectCity: function( name, value ) {
                var html,
                    that = this,
                    instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );

                //缓存城市数据,用于后续字符串拼接
                instance._cityData = {
                    name: name,
                    value: value
                };
                that._abortPromise( "getCountryPromise" );//终止获取区县异步请求
                if ( SPECIAL_CODES[ value ] ) {

                    //直接返回值,不再向后台获取区县数据
                    that._eventCallbacks.selectCountry.call( instance, name, value, true );
                }else {

                    //重新发送获取区县异步请求
                    PROMISE.getCountryPromise = $.getJSON( instance._remote.url.getCountry + "?callback=?", {
                        cityId: value
                    } ).done( function( res ) {
                        if ( res && res.length ) {
                            html = Mustache.render( TEMPLATE.countryItem, {
                                data: res
                            } );
                        }else {
                            html = TEMPLATE.emptyCountry;
                        }
                    } ).fail( function( jqXHR, textStatus ) {
                        if ( textStatus !== "abort" ) {
                            html = TEMPLATE.emptyCountry;
                        }
                    } ).always( function() {
                        if ( html ) {
                            that._$areaSelectorPopCountryList.html( html );//重新渲染区县列表值
                            $( ".area-selector-pop-nav>li[data-target=\"country\"]" ).click();//触发选择区县tab
                        }
                        PROMISE.getCountryPromise = instance = null;
                    } );
                }

            },

            /**
             * 选中区县
             * @param  {[type]} name  名称
             * @param  {[type]} value code值
             * @return {[type]}       [description]
             */
            selectCountry: function( name, value, one ) {
                var that = this,
                    instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );

                if ( instance._$hiddenFiled ) {
                    instance._$hiddenFiled.val( value );//隐藏域最终值是区县code值
                }
                instance._$targetInput
                    .val( one === true ? instance._cityData.name : [ instance._cityData.name, name ].join( "-" ) )
                    .attr( "data-idv", value );//设置输入框值

                if ( instance._selectedCallback ) {
                    instance._selectedCallback( {
                        text: name,
                        value: value
                    }, instance, {
                        value: value,
                        country: name,
                        city: instance._cityData.name
                    } );
                }
                instance.trigger( "selected", [ {
                    text: name,
                    value: value
                }, instance, {
                    value: value,
                    country: name,
                    city: instance._cityData.name
                } ] );
                that._eventCallbacks.hideAreaSelectorPop.call( that );//隐藏地区选择弹层
                instance = null;
            },

            /**
             * 重置下拉菜单/区县选择弹层位置
             * @param  {[type]} e       [description]
             * @return {[type]}         [description]
             */
            resetPosition: function() {
                var instance,
                    that = this;

                that._clearTimer( "resetPositionTimer" );
                TIMERS.resetPositionTimer = setTimeout( function() {
                    instance = that._getAreaSelectorInstanceByIdx( that._$areaSelectorPop );
                    instance._setPosition( that._$dropdownMenu )//重新设置下拉菜单位置
                            ._setPosition( that._$areaSelectorPop );//重置地区选择弹框
                    instance = that = null;
                }, DELAY_TIME.RESET_POSITION );
            }
        }
    } );
    prototypeFn._init.prototype = prototypeFn;

    $.cowboy.plugin( AreaSelector ); //暴露组件并转成jQuery插件
} ) );
