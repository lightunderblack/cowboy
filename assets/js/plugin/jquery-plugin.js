( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "./jquery-version" ], factory );
    } else {
        factory( root.jQuery );
    }
}( this, function( $ ) {
    var slice = Array.prototype.slice;

    var Util = {
        getters: [],

        //判断是否不支持链式
        isNotChained: function( method, otherArgs ) {
            var length = otherArgs.length;
            if ( method === "option" && ( length === 0 || ( length === 1 && typeof otherArgs[ 0 ] === "string" ) ) ) {
                return true;
            }
            return !!~$.inArray( method, Util.getters );
        }
    };

    //组件插件化
    $.cowboy.plugin = function( name, object ) {
        if ( arguments.length === 1 ) {
            object = name;
            name = $.camelCase( object.prototype.fullName );
        }

        if ( $.cowboy.isPluginExisten( name ) ) {
            return;
        }

        $.cowboy.plugins[ name ] = object;

        $.fn[ name ] = function( options ) {
            var result,
                instance,
                $first = this.eq( 0 ),
                otherArgs = slice.call( arguments, 1 ),
                dataName = "cowboy-" + ( object.prototype.fullName || "instance" ).toLowerCase();

            if ( Util.isNotChained( options, otherArgs ) ) {
                if ( !( instance = $first.data( dataName ) ) ) {
                    $.error( "请先初始化" );
                }
                if ( options.charAt( 0 ) !== "_" && instance[ options ] ) {
                    return instance[ options ].apply( instance, otherArgs );
                } else {
                    $.error( "不存在" + options + "方法" );
                }
            }

            this.each( function() {
                var item,
                    extractOption,
                    $wrapper = $( this ),
                    instance = $wrapper.data( dataName );

                if ( typeof( options ) === "string" ) {
                    if ( !instance ) {
                        $.error( "请先初始化" );
                    }
                    if ( options.charAt( 0 ) !== "_" && instance[ options ] ) {

                        //调用其他方法
                        item = instance[ options ].apply( instance, otherArgs );
                        if ( item != null && item !== instance ) {
                            ( result = result || [] ).push( item );
                        }
                    } else {
                        $.error( "不存在" + options + "方法" );
                    }
                } else {

                    //若已初始化则先销毁
                    if ( instance && typeof( instance.destroy ) === "function" ) {
                        instance.destroy();
                    }

                    if ( otherArgs.length ) {
                        options = $.extend.apply( null, [ true, options ].concat( otherArgs ) );
                    }
                    if ( !$.isEmptyObject( ( extractOption = $wrapper.data() ) ) ) {
                        options = $.extend.apply( null, [ true, options ].concat( extractOption ) );
                    }

                    //初始化方法
                    instance = new object( $.extend( true, {}, options, {
                        $element: $wrapper
                    } ) );

                    //缓存实例
                    $wrapper.data( dataName, instance );
                }
            } );

            return result ? ( result.length === 1 ? result[ 0 ] : result ) : this;
        };
    };

    //判断组件/插件是否已存在 防止反复初始化/覆盖
    $.cowboy.isPluginExisten = function( name ) {
        var isExisten = false;

        if ( $.cowboy.plugins[ name ] || $.fn[ name ] ) {
            console && console.warn && console.warn( "已存在" + name + "插件" );
            isExisten = true;
        }

        return isExisten;
    };
} ) );
