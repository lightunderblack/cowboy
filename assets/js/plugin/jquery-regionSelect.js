( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
	//省市县级联菜单
	var fullName = "region-select";

	//模板
	var TEMPLATE = {
		emptyOption: "<option value=\"\">请选择</option>",
		options:[
			"{{#options}}",
				"<option value=\"{{id}}\">{{name}}</option>",
			"{{/options}}"
		].join( "" )
	};

	var RegionSelect = function( options ) {
		return new RegionSelect.prototype._init( options );
	};
	var prototypeFn = RegionSelect.prototype;
	$.extend( prototypeFn, {
		fullName: fullName,

		/**
		 * 设置值
		 * @param {Object} value 设置各项级联的值
		 */
		setValue: function( value ) {
			var $select,
				that = this,
				$selectedOption,
				$firstSelect = that._$firstSelect,
				maxSelectIndex = that._maxSelectIndex;

			if ( $firstSelect.children().length > 1 ) {
				$firstSelect.find( "option:selected" ).prop( "selected", false );
				$selectedOption = $firstSelect.find( "option[value=\"" + value[ 0 ] + "\"]" ).prop( "selected", true );
				that._$hiddens[ 0 ].val( $selectedOption.text() );
				$firstSelect.triggerHandler( "change" );
			}
			that._customEvent.on( "loaded", function( event, idx ) {
				idx = +idx;
				$select = that._$selects.eq( idx );
				$select.find( "option:selected" ).prop( "selected", false );
				$selectedOption = $select.find( "option[value=\"" + value[ idx ] + "\"]" ).prop( "selected", true );
				that._$hiddens[ idx ].val( $selectedOption.text() );
				$select.triggerHandler( "change" );
				if ( idx === maxSelectIndex ) {
					that._customEvent.off( "loaded" );
				}
			} );

			return that;
		},

		/**
		 * 初始化
		 * @param  {[type]} options 初始化参数
		 */
		_init: function( options ) {
			var that = this;

			that._promise = {};
			that._customEvent = $( {} );
			that._options = options;
			that._cacheParam()
				._bindEventListener()
				._loadFirstSelectOptions();
		},

		/**
		 * 载入级联第一项数据
		 */
		_loadFirstSelectOptions: function() {
			var that = this;
			that._setNextsSelectEmpty( that._$firstSelect );
			that._loadSelectOptions( that._$firstSelect, 0 );
			return that;
		},

		/**
		 * 缓存常用变量
		 */
		_cacheParam: function() {
			var that = this,
				$hiddens = [],
				$wrapper = that._options.$wrapper;

			that._$selects = $wrapper.find( "select" ).each( function( i) {
				var $this = $( this );
				$this.attr( "data-idx", i );
				$hiddens.push( $wrapper.find( "input:hidden[name=\"" + $this.attr( "data-hidden" ) + "\"]" ) );
			} );
			that._$hiddens = [].concat( $hiddens );
			that._$firstSelect = that._$selects.first();
			that._maxSelectIndex = that._$selects.length - 1;
			$hiddens = null;

			return that;
		},

		/**
		 * 绑定事件
		 */
		_bindEventListener: function() {
			var that = this,
				$wrapper = that._options.$wrapper,
				maxSelectIndex = that._maxSelectIndex,
				selectChangeCallback = that._selectChangeCallback;

			that._$selects.on( "change", function() {
				var $next,
					$this = $( this ),
					selectIndex = +$.trim( $this.attr( "data-idx" ) ),
					value = $.trim( $this.val() ),
					text = $this.find( "option:selected" ).text();

				that._setSelectsHiddenValue( selectIndex, value === "" ? "" : text );
				if ( selectIndex !== maxSelectIndex ) {
					$next = $wrapper.find( "select[data-idx=\"" + ( selectIndex + 1 ) + "\"]" );
					that._setNextsSelectEmpty( $this );
					that._loadSelectOptions( $next, value );
				}
				selectChangeCallback && selectChangeCallback.call( that, $this, value, text );
			} );

			return that;
		},

		/**
		 * 载入级联项数据，通用
		 * @param  {[type]} $target
		 * @param  {[type]} value
		 */
		_loadSelectOptions: function( $target, value ) {
			var data = [],
				that = this;

			if ( that._promise.load ) {
				that._promise.load.abort();
				that._promise.load = null;
			}
			if ( value === "" ) {
				$target.html( TEMPLATE.emptyOption );
				that._customEvent.trigger( "loaded", $.trim( $target.attr( "data-idx" ) ) );
			}else {
				that._promise.load = $.get( that._options.url, {
					pid: value
				} ).done( function( result ) {
					data = result;
				} ).always( function() {
					var html;
					if ( data.length ) {
						html = Mustache.render(TEMPLATE.options, {
							options: data
						} );
						html = TEMPLATE.emptyOption + html;
					}else {
						html = TEMPLATE.emptyOption;
					}
					$target.html( html );
					that._customEvent.trigger( "loaded", $.trim( $target.attr( "data-idx" ) ) );
					$target = null;
				} );
			}

			return that;
		},

		/**
		 * 清空下一级联项数据
		 * @param {[type]} $current 当前级联项
		 */
		_setNextsSelectEmpty: function( $current ) {
			var that = this,
				$wrapper = that._options.$wrapper,
				maxSelectIndex = that._maxSelectIndex,
				selectIndex = +$.trim( $current.attr( "data-idx" ) );

			for ( var i = selectIndex + 1; i <= maxSelectIndex; i++ ) {
				$wrapper.find( "select[data-idx=\"" + i + "\"]" ).html( TEMPLATE.emptyOption );
			}
		},

		/**
		 * 设置级联项隐藏域值
		 * @param {[type]} selectIndex [description]
		 * @param {[type]} value       [description]
		 */
		_setSelectsHiddenValue: function( selectIndex, value ) {
			var that = this,
				$hiddens = that._$hiddens,
				maxSelectIndex = that._$maxSelectIndex;

			selectIndex = +selectIndex;
			$hiddens[ selectIndex ].val( value );
			if ( selectIndex !== maxSelectIndex ) {
				for ( var i = selectIndex; i <= maxSelectIndex; i++ ) {
					$hiddens[ i ].val( "" );
				}
			}

			return that;
		}
	} );
	prototypeFn._init.prototype = prototypeFn;

	$.cowboy.plugin( RegionSelect ); //暴露组件并转成jQuery插件
} ) );
