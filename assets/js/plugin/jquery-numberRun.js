( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
    var fullName = "number-run";

    var Util = {

        //生成数组
        madeArray: function() {
            var array = [];

            for ( var i = 0; i <= 9; i++ ) {
                array.push( i );
            }

            return array;
        },

        //格式化数字
        formatNumber: function( number ) {
            var numbers,
                decimals,
                integrals,
                isNegative,
                result = "";

            if ( !$.isNumeric( number ) ) {
                return ""; //若不是数字直接返回
            }
            isNegative = number < 0; //是否负数
            number = "" + Math.abs( number ); //转成字符串
            numbers = number.split( /\./ ); //根据小数点分割
            integrals = numbers.shift(); //整数
            decimals = numbers.pop(); //小数
            for ( var index = 0, length = integrals.length, last = length - 1, i = last; i >= 0; i-- ) {
                result = integrals.charAt( i ) + result;
                if ( ( index + 1 ) % 3 === 0 && index !== last ) {
                    result = "," + result;
                }
                index += 1;
            }
            if ( decimals ) {
                result += "." + decimals;
            }

            return isNegative ? "-" + result : result;
        }
    };

    if ( $.cowboy.isPluginExisten( $.camelCase( fullName ) ) ) {
        return;
    }

    //样式注入
    var styles = [
        "<style>",
        ".inline-block{display: inline-block; *zoom:1; *display: inline;}",
        ".cowboy-number-run .text-center{text-align: center;}",
        ".cowboy-number-run .marin-left-offset{margin-left: -4px; +margin-left: 0;}",
        ".cowboy-number-run .number-text{position: relative; bottom: 4px; +bottom: 2px;}",
        ".cowboy-number-run .number-list{display: block; margin-top: 0;}",
        ".cowboy-number-run .number-item{color: #0459b3; font-size: 24px; font-weight: bold; width: 20px; height: 27px; line-height: 27px; display: block; font-style: normal; text-align: center;}",
        "</style>"
    ].join( "" );
    $( "head", document ).append( styles );

    var NumberRun = function( option ) {
        return new NumberRun.prototype._init( option );
    };
    var prototypeFn = NumberRun.prototype;
    $.extend( prototypeFn, {
        fullName: fullName,

        //Run Number, Run!!
        run: function() {
            var that = this;

            $( ".number-list", that._$element ).each( function() {
                var $this = $( this );
                $this.animate( {
                    "margin-top": $this.data( "offset" )
                }, {
                    duration: that._duration,
                    easing: $this.data( "easing" )
                } );
            } );

            return that;
        },

        //默认配置项
        _defaultOption: {
            value: 0, //跑动的数字值，必须是数字类型
            autoRun: false, //默认不自动跑
            duration: 1000, //动画默认时间
            $element: $( document.body ),
            easing: [ "linear", "swing" ], //动画效果为jQuery内部支持的动画,可传第三方动画库
            template: { //模板
                comma: '<span class="number-comma">,</span>', //千分位逗号
                period: '<span class="number-period">.</span>', //小数点
                negative: '<span class="number-negative">-</span>', //负号
                numberList: [ //滚动的数字列表
                    '<strong class="number-list-wrapper inline-block">',
                    '<span class="number-list" data-offset="{{offset}}" data-value="{{value}}" data-easing="{{easing}}" data-digit="{{digit}}" style="margin-top:{{marginTop}}px">',
                    "{{#number}}",
                    '<i class="number-item">{{.}}</i>',
                    "{{/number}}",
                    "</span>",
                    "</strong>"
                ].join( "" )
            }
        },

        //构造函数
        _init: function( option ) {
            var that = this;

            that._option = $.extend( true, {}, that._defaultOption, option );
            that._cacheParam()._generate();
            that._$element.addClass( "cowboy-number-run" );
            if ( that._autoRun ) {
                that.run(); //Run Number, Run！
            }

            return that;
        },

        //缓存常用参数
        _cacheParam: function() {
            var that = this;

            $.each( that._option, function( key, value ) {
                that[ "_" + key ] = value;
            } );

            return that;
        },

        //生成结构
        _generate: function() {
            var num,
                digit,
                html = [],
                that = this,
                numCount = 0,
                number = that._value,
                easing = that._easing,
                $target = that._$element,
                template = that._template,
                formatNumber = Util.formatNumber( number ),
                numberLength = ( parseInt( number, 10 ) + "" ).length;

            for ( var i = 0, length = formatNumber.length; i < length; i++ ) {
                num = formatNumber.charAt( i );
                if ( $.isNumeric( num ) ) {

                    //数字
                    num = parseInt( num, 10 );
                    digit = numberLength - numCount;
                    html.push( Mustache.render( template.numberList, {
                        value: num,
                        digit: digit,
                        offset: -num * 27,
                        number: Util.madeArray( num ),
                        easing: easing[ Math.floor( Math.random() * ( easing.length - 1 ) + 1 ) ]
                    } ) );
                    numCount = numCount + 1;
                } else if ( num === "," ) {

                    //逗号
                    html.push( Mustache.render( template.comma ) );
                } else if ( num === "-" ) {

                    //负号
                    html.push( Mustache.render( template.negative ) );
                } else {

                    //小数点
                    numCount = numCount + 1;
                    html.push( Mustache.render( template.period ) );
                }
            }
            $target.html( html.join( "" ) );

            return that;
        }
    } );
    NumberRun.prototype._init.prototype = prototypeFn;

    $.cowboy.plugin( NumberRun ); //暴露组件并转成jQuery插件
} ) );
