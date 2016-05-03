( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
	var fullName = "type-aheader";

    if ( $.cowboy.isPluginExisten( $.camelCase( fullName ) ) ) {
        return;
    }

	var document = window.document,
		hasOwnProperty = ( {} ).hasOwnProperty;

	var PREFIX = "type-aheader-selector";

	//支持键盘导航的键值
	var KEY_CODE = {
		up: 38,//向上
		down: 40//向下
	};
	var KEY_BORAD_NAV = {};
	KEY_BORAD_NAV[ KEY_CODE.up ] = 1;
	KEY_BORAD_NAV[ KEY_CODE.down ] = 1;

	//延时时间
	var DELAY_TIME = {
		RESIZE: 150,
		SEARCH: 200,
		HIDE_INPUT_BOX: 200
	};

	var CLASSNAME = {
		ACTIVE_CLASS_NAME: "active",//下拉菜单选中样式
		DISABLED_CLASS_NAME: "disabled"//菜单选项不可用
	};

	//模板
	var TEMPLATE = {
		hiddenFiled: '<input type="hidden" />',//隐藏域
		autocomplete: '<div class="auto-complete-selector"></div>',
		menuEmpty: '<li class="disabled"><a href="#">{{text}}</a></li>',//数据为空
		dropdownMenu: '<ul class="auto-complete-selector-dropdown-menu"></ul>',
		menuItem: '{{#list}}<li data-value="{{value}}"><a href="#">{{text}}</a></li>{{/list}}',
		loading: '<img class="autocomplete-loading" src="{{baseUrl}}/resources/images/autocomplete_loading.gif" />'
	};

	//注入样式
	var styles = [
		"<style>",
			".auto-complete-selector{display:inline-block; position: relative;}",
			".autocomplete-loading{width: 11px; height: 11px; position: absolute; top: 10px; display: none; z-index: 100;}",
			".auto-complete-selector-dropdown-menu {position: absolute; display: none; float: left; min-width: 160px; padding: 5px 0; margin: 2px 0 0; list-style: none; background-color: #fff; border: 1px solid #ccc;}",
			".auto-complete-selector-dropdown-menu li a {display: block; padding: 3px 20px; clear: both; font-weight: normal; line-height: 20px; color: #333; white-space: nowrap;}",
			".auto-complete-selector-dropdown-menu li a:hover {color: #fff; text-decoration: none; background-color: #27a0e5;}",
			".auto-complete-selector-dropdown-menu{z-index: 100000; padding: 0; margin: 1px 0 0; +height: 200px; max-height: 200px; overflow: hidden; overflow-y: auto;}",
			".auto-complete-selector input[readonly]{background-color:transparent;cursor:default;}",
			".auto-complete-selector-dropdown-menu{-webkit-border-radius:0;-moz-border-radius:none;border-radius:0;padding:0;margin:1px 0 0;max-height:300px;overflow:hidden;overflow-y:auto;}",
			".auto-complete-selector-dropdown-menu li a{padding:6px 14px;background-image:none;}",
			".auto-complete-selector-dropdown-menu .disabled a, .auto-complete-selector-dropdown-menu .disabled a:hover, .auto-complete-selector-dropdown-menu .disabled a:focus{cursor:default;}",
		"</style>"
	].join( "" );
	$( "head", document ).append( styles );

	var Typeaheader = function( options ) {
		return new Typeaheader.prototype._init( options );
	};
	var prototypeFn = Typeaheader.prototype;
	$.extend( prototypeFn, {
		fullName: fullName,
			
		//默认配置项
		options: {
			target: null,//必填,可传selector或jQuery对象
			disabled: true,//默认组件可用
			remote: {//必填,搜索有关配置项
				url: "",//搜索请求地址
				requestType: "get",
				parse: null,//结果数据的预处理函数,不同的后台返回的数据格式不同,该函数可以实现数据格式及字段一致
				paramName: "keyword"//参数名称
			},
			hidden: null,//选填,是否需要添加hidden表单 i.e.{name:"companyId"}
			selectedCallback: null//选填,选中搜索结果项回调函数
		},

		/**
		 * 销毁组件,释放内存
		 * @return {[type]} [description]
		 */
		destroy: function() {
			var that = this,
				prefix = "." + that._containerId;

			that._clearTimer()
				._abortPromise();

			$( document ).off( prefix );
			$( window ).off( prefix );
			that._$dropdownMenu.off( prefix );
			that._$container.off( prefix );
			that._events.off();//移除所有自定义事件
			that._revertBack();//还原
			that._$container.remove();//移除DOM
			that._$dropdownMenu.remove();
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
		 * 获取缓存数据
		 */
		getCacheData: function() {
			return this._cacheData;
		},

		/**
		 * 通过id值获取缓存数据
		 */
		getCacheDataById: function( $target ) {
			var cacheData,
				that = this;

			if ( that._cacheData ) {
				cacheData = that._cacheData[ $target.closest( "ul" ).children().index( $target ) ];
			}

			return $.extend( true, {}, cacheData );
		},

		/**
		 * 获取组件jQuery对象
		 */
		getContainer: function() {
			return this._$container;
		},

		/**
		 * 获取
		 */
		getDropdownMenu: function() {
			return this._$dropdownMenu;
		},

		/**
		 * 获取文本输入框jQuery对象
		 */
		getInput: function() {
			return this._$targetInput;
		},

		/**
		 * 获取文本隐藏域jQuery对象
		 */
		getHiddenFiled: function() {
			return this._$hiddenFiled;
		},

		/**
		 * 添加自定义事件
		 */
		on: function() {
			var that = this,
				events = that._events;
			events.on.apply( events, arguments );
			return that;
		},

		/**
		 * 移除自定义事件
		 */
		off: function() {
			var that = this,
				events = that._events;
			events.off.apply( events, arguments );
			return that;
		},

		/**
		 * 触发自定义事件
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
		 */
		_initComponent: function() {
			var id,
				$target,
				$container,
				that = this,
				target = that._target;

			if ( target.jquery ) {
				$target = target;
			}else {
				$target = $( target );
			}
			if ( !$target || !$target.length ) {
				$.error( "初始化时，请传入$target参数" );
			}else {
				$container = $( TEMPLATE.autocomplete ).append( $target.clone().addClass( "auto-complete-target" ).attr( "autocomplete", "off" ) );
				$target.replaceWith( $container );
				id = PREFIX + "-" + ( $.cowboy.GUID++ );
				that._containerId = id;
				$container.attr( {
					id: id
				} );
				that._$container = $container;

				that._$dropdownMenu = $( TEMPLATE.dropdownMenu ).appendTo( document.body );
				that._$targetInput = $container.find( ".auto-complete-target" );
				that._createHiddenFiled()._createLoading();
			}

			return that;
		},

		/**
		 * 还原input框
		 */
		_revertBack: function() {
			var that = this,
				$targetInput = that._$targetInput;

			$targetInput
				.show()
				.removeClass( "auto-complete-target" );
			that._$container.replaceWith( $targetInput );

			return that;
		},

		/**
		 * 设置下拉菜单位置
		 */
		_setDropDownMenuPosition: function() {
			var that = this,
				 $targetInput = that._$targetInput,
				 inputOffset = $targetInput.offset();

			that._$dropdownMenu.css( {
				"left": inputOffset.left + "px",
				"min-width": $targetInput.outerWidth() + "px",
				"top": ( $targetInput.outerHeight() + inputOffset.top ) + "px"
			} );

			return that;
		},

		/**
		 * 生成hidden表单域
		 */
		_createHiddenFiled: function() {
			var selector,
				hiddenName,
				$hiddenFiled,
				that = this,
				hiddenConfig = that._hiddenFiled;

			if ( hiddenConfig && ( hiddenName = $.trim( hiddenConfig.name ) ) ) {
				selector = 'input:hidden[name="' + hiddenName + '"]';
				$hiddenFiled = that._$container.parent().find( selector );
				if ( !$hiddenFiled.length ) {
					$hiddenFiled = that._$container.closest( "form" ).find( selector );
				}
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
		 * 创建loading小图标
		 */
		_createLoading: function() {
			var that = this,
				$container = that._$container,
				$loading = $container.find( ".autocomplete-loading" );

			if ( $loading.length ) {
				that._$loading = $loading;
			}else {
				$loading = that._$loading = $( Mustache.render( TEMPLATE.loading, { baseUrl: that._baseUrl || "" } ) ).prependTo( $container );
				$loading.css( {
					left: that._$targetInput.outerWidth( true ) - 16
				} );
			}

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
			that._timer = {};//存储需要使用的计时器
			that._promise = {};//异步请求XHR对象
			that._events = $( {} );//初始化自定义事件对象
			that._cacheData = null;//数据缓存

			return that;
		},

		/**
		 * 绑定事件
		 */
		_bindEventListener: function() {
			var that = this,
				prefix = that._containerId,
				targetInput = ".auto-complete-target",
				eventCallbacks = that._eventCallbacks;

			$( window )
				.off( "." + prefix )
				.on( "resize." + prefix, function( e ) {
					eventCallbacks.windowResize.call( that, e, $( this ) );
				} );

			$( document )
				.off( "." + prefix )
				.on( "click." + prefix, function( e ) {
					that._eventCallbacks.clickOthers.call( that, e, $( e.target ) );
				} );

			that._$container
				.off( "." + prefix )
				.on( "keydown." + prefix, targetInput, function( e ) {
					eventCallbacks.keydownInputbox.call( that, e, $( this ) );
				} )
				.on( "focusin." + prefix, targetInput, function( e ) {
					eventCallbacks.changeInputBox.call( that, e, $( this ) );
				} )
				.on( "keyup." + prefix, targetInput, function( e ) {
					eventCallbacks.changeInputBox.call( that, e, $( this ) );
				} );

			that._$dropdownMenu
				.off( "." + prefix )
				.on( "click." + prefix, "li", function( e ) {
					eventCallbacks.clickDropdownMenuItem.call( that, e, $( this ) );
				} );

			return that;
		},

		/**
		 * 选中搜索下拉项
		 */
		_selectResult: function( value, $target ) {
			var that = this,
				data = that._cacheData[ $target.closest( "ul" ).children().index( $target ) ];

			that._$targetInput.val( value.text );
			if ( that._$hiddenFiled ) {

				//若有hidden表单域则设置值
				that._$hiddenFiled.val( value.value );
			}
			if ( that._selectedCallback ) {
				that._selectedCallback( value, $target, $.extend( true, {}, data ) );
			}
			that.trigger( "selected", [ value, $target, that, $.extend( true, {}, data ) ] );

			return that;
		},

		/**
		 * 回车键选中搜索下拉项
		 */
		_keyDownToSelectResult: function() {
			var that = this;

			if ( that._isSearchNoEmpty() ) {
				that._eventCallbacks.focusoutInputBox.call( that );
			}

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
				$current = $dropdownMenu.find( "." + CLASSNAME.ACTIVE_CLASS_NAME );
				if ( $current.length ) {
					$current.removeClass( CLASSNAME.ACTIVE_CLASS_NAME );
					if ( isUp ) {
						$current = $current.prev();
						while ( $current.length && $current.hasClass( CLASSNAME.DISABLED_CLASS_NAME ) ) {
							$current = $current.prev();
						}
					}else {
						$current = $current.next();
						while ( $current.length && $current.hasClass( CLASSNAME.DISABLED_CLASS_NAME ) ) {
							$current = $current.next();
						}
					}
				}else {
					$current = $dropdownMenu.children().not( "." + CLASSNAME.DISABLED_CLASS_NAME ).first();
				}
				if ( $current.length ) {
					$current.addClass( CLASSNAME.ACTIVE_CLASS_NAME );
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
				that._timer.searchTimer = setTimeout( function() {
					that._search( keyword );
				}, DELAY_TIME.SEARCH );
			}else {
				that._$loading.hide();
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
				promise,
				that = this,
				params = {},
				dataType = "json",
				remote = that._remote,
				type = remote.requestType,
				tpl = TEMPLATE.menuEmpty;

			params[ remote.paramName ] = keyword;

			//额外参数
			if ( $.isPlainObject( remote.extraParam ) ) {
				params = $.extend( true, params, remote.extraParam );
			}else if ( $.isFunction( remote.extraParam ) ) {
				params = $.extend( true, params, remote.extraParam.call( null ) );
			}

			//若requestType为getJSON则当做JSONP方式请求数据
			if ( type === "getJSON" ) {
				type = "get";
				dataType = "jsonp";
			}

			that._$loading.show();
			promise = that._promise.searchPromise  = $.ajax( {
				type: type,
				data: params,
				cache: false,//禁止缓存
				url: remote.url,
				dataType: dataType,
				timeout: that._timeout
			} );
			promise
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
						that._cacheData = data;
					}else {
						modal = {
							text: "没有匹配的内容"
						};
						that._cacheData = null;
					}

				} )
				.fail( function( jqXHR, textStatus ) {
					if ( textStatus !== "abort" ) {
						modal = {
							text: "搜索失败请稍后重试"
						};
					}
					that._cacheData = null;
				} )
				.always( function() {
					if ( modal ) {
						that._$loading.hide();
					}
					that._renderDropdownMenu( tpl, modal );
					modal = remote = tpl = null;
				} );

			return that;
		},

		/**
		 * 搜索结果是否失败或为空
		 * @return {Boolean} [description]
		 */
		_isSearchNoEmpty: function() {
			return !!this._$dropdownMenu.children().not( "." + CLASSNAME.DISABLED_CLASS_NAME ).length;
		},

		/**
		 * 渲染下拉菜单
		 * @param  {[type]} tpl   模板
		 * @param  {[type]} modal 数据
		 * @return {[type]}
		 */
		_renderDropdownMenu: function( tpl, modal ) {
			var length,
				that = this,
				$dropdownItems,
				$dropdownMenu = that._$dropdownMenu;

			if ( modal ) {
				$dropdownMenu.html( Mustache.render( tpl, modal ) );
				$dropdownItems = $dropdownMenu.find( "li" ).not( "." + CLASSNAME.DISABLED_CLASS_NAME );
				if ( length === 1 ) {
					$dropdownItems.addClass( CLASSNAME.ACTIVE_CLASS_NAME );
				}
				if ( !that._isFirstRender ) {
					that._isFirstRender = true;
					that._setDropDownMenuPosition();
				}
				$dropdownMenu.show();
			}

			return that;
		},

		/**
		 * 隐藏输入框
		 * @param  {[type]} delay 延时时长
		 */
		_hideDropdownMenu: function( delay, excuteFunc ) {
			var that = this,
				hide = function() {
					that._$dropdownMenu.html( "" ).scrollTop( 0 ).hide();
				};

			delay = delay || 0;
			that._clearTimer( "hideDropdownMenuTimer" );//先清空计时器
			if ( delay ) {

				//若传入延时时长大于0则重新设定计时器
				that._timer.hideDropdownMenuTimer = setTimeout( function() {
					excuteFunc && excuteFunc.call( that );
					hide();
				}, delay );
			}else {
				hide();//否则直接隐藏
			}

			return that;
		},

		/**
		 * 清除计时器
		 * @param  {[type]} name [description]
		 * @return {[type]}      [description]
		 */
		_clearTimer: function( name ) {
			var that = this;

			if ( name != null && that._timer[ name ] ) {
				clearTimeout( that._timer[ name ] );
				that._timer[ name ] = null;
			}else {
				$.each( that._timer, function( key) {
					if ( that._timer[ key ] ) {
						clearTimeout( that._timer[ key ] );
						that._timer[ key ] = null;
					}
				} );
			}

			return that;
		},

		/**
		 * 终止搜索请求
		 * @return {[type]} [description]
		 */
		_abortPromise: function( name ) {
			var that = this;

			if ( name != null && that._promise[ name ] ) {
				that._promise[ name ].abort();
				that._promise[ name ] = null;
			}else {
				$.each( that._promise, function( key) {
					if ( that._promise[ key ] ) {
						that._promise[ key ].abort();
						that._promise[ key ] = null;
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
				var that = this;

				if ( !$target.closest( "#" + that._containerId ).length ) {
					that._hideDropdownMenu( 0 );//点击其他地方直接隐藏
				}
			},

			/**
			 * 输入框失去焦点事件处理
			 * @return {[type]} [description]
			 */
			focusoutInputBox: function() {
				var that = this;
				that._hideDropdownMenu( DELAY_TIME.HIDE_INPUT_BOX, function() {
					this._$dropdownMenu.find( "." + CLASSNAME.ACTIVE_CLASS_NAME ).click();
				} );
			},

			/**
			 * 输入框按钮事件回调
			 * @param  {[type]} e       [description]
			 * @param  {[type]} $target [description]
			 * @return {[type]}         [description]
			 */
			keydownInputbox: function( e) {
				var keyCode = e.keyCode;

				//支持键盘操作
				if ( keyCode === 13 ) {
					this._keyDownToSelectResult();
					e.preventDefault();//阻止回车键默认行为
				}else {
					this._keyBoardNavigate( keyCode, e );
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

				if ( !$target.hasClass( CLASSNAME.DISABLED_CLASS_NAME ) ) {
					that._$dropdownMenu
						.find( "." + CLASSNAME.ACTIVE_CLASS_NAME )
						.removeClass( CLASSNAME.ACTIVE_CLASS_NAME );
					$target.addClass( CLASSNAME.ACTIVE_CLASS_NAME );
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
				var that = this,
					keyCode = e.keyCode;

				if ( KEY_BORAD_NAV[ keyCode ] || keyCode === 13 ) {
				}else {
					that._toSeach( $.trim( $target.val() ) );
				}
			},

			/**
			 * 窗口重置
			 * @param  {[type]} e       [description]
			 * @param  {[type]} $target [description]
			 * @return {[type]}         [description]
			 */
			windowResize: function( ) {
				var that = this;

				that._clearTimer( "resizeTimer" );
				that._timer.resizeTimer = setTimeout( function() {
					that._setDropDownMenuPosition();
				}, DELAY_TIME.RESIZE );
			}
		}
	} );
	prototypeFn._init.prototype = prototypeFn;

	$.cowboy.plugin( Typeaheader ); //暴露组件并转成jQuery插件
} ) );
