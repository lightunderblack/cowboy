( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery", "mustache", "./jquery-plugin" ], factory );
    } else {
        factory( root.jQuery, root.Mustache );
    }
}( this, function( $, Mustache ) {
	var fullName = "auto-complete-selector";

    if ( $.cowboy.isPluginExisten( $.camelCase( fullName ) ) ) {
        return;
    }

	var document = window.document,
		hasOwnProperty = ( {} ).hasOwnProperty;

	var KEY_CODE = {
		up: 38,//向上
		down: 40//向下
	};

	var PREFIX = "auto-complete-selector";

	//支持键盘导航的键值
	var KEY_BORAD_NAV = {};
	KEY_BORAD_NAV[ KEY_CODE.up ] = 1;
	KEY_BORAD_NAV[ KEY_CODE.down ] = 1;

	//延时时间
	var DELAY_TIME = {
		RESIZE: 150,
		SEARCH: 250,
		HIDE_INPUT_BOX: 200
	};

	var CLASS_NAME = {
		ACTIVE_CLASS_NAME: "active",//下拉菜单选中样式
		DISABLED_CLASS_NAME: "disabled"//菜单选项不可用
	};

	//模板
	var TEMPLATE = {
		hiddenFiled: '<input type="hidden" />',
		autocomplete: '<div class="auto-complete-selector"></div>',
		menuEmpty: '<li class="disabled"><a href="#">{{text}}</a></li>',
		loading: '<img class="autocomplete-loading" src="{{loadingImg}}" />',
		dropdownMenu: '<ul class="auto-complete-selector-dropdown-menu dropdown-menu"></ul>',
		menuItem: '{{#list}}<li data-value="{{value}}"><a href="#">{{text}}</a></li>{{/list}}'
	};

	//注入样式
	var styles = [
		"<style>",
			".auto-complete-selector{display:inline-block; position: relative;}",
			".autocomplete-loading{width: 11px; height: 11px; position: absolute; top: 10px; display: none; z-index: 100;}",
			".auto-complete-selector .auto-complete-input, .auto-complete-selector-dropdown-menu{display:none;}",
			".auto-complete-selector input[readonly]{background-color:transparent;cursor:default;}",
			".auto-complete-selector .auto-complete-input{z-index:10;position:absolute;}",
			".auto-complete-selector-dropdown-menu{z-index: 100000;-webkit-border-radius:0;-moz-border-radius:none;border-radius:0;padding:0;margin:1px 0 0;max-height:300px;overflow:hidden;overflow-y:auto;}",
			".auto-complete-selector-dropdown-menu>li>a{padding:6px 14px;background-image:none;}",
			".auto-complete-selector-dropdown-menu>.disabled>a, .auto-complete-selector-dropdown-menu>.disabled>a:hover, .auto-complete-selector-dropdown-menu>.disabled>a:focus{cursor:default;}",
		"</style>"
	].join( "" );
	$( "head", document ).append( styles );

	var AutoCompleteSelector = function( options ) {
		return new AutoCompleteSelector.prototype._init( options );
	};
	var prototypeFn = AutoCompleteSelector.prototype;
	$.extend( prototypeFn, {
		fullName: fullName,

		/**
		 * 销毁组件,释放内存
		 * @return {[type]} [description]
		 */
		destroy: function() {
			var that = this,
				prefix = that._containerId;

			that._clearTimer()//清除所有计时器
				._abortSearchPromise();//终止所有异步请求

			//移除所有绑定事件
			$( window ).off( "." + prefix );
			$( document ).off( "." + prefix );
			that._$container.off( "." + prefix );
			that._$dropdownMenu.off( "." + prefix );
			that._events.off();//移除所有自定义事件

			//还原
			that._revertBack();

			//移除DOM
			that._$container.remove();
			that._$dropdownMenu.remove();

			//移除所有自有属性
			for ( var property in that ) {
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
				disabled: true,
				readonly: false
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
				disabled: false,
				readonly: true
			} );
			that._$inputBox.prop( {
				disabled: false
			} );

			return that;
		},

		/**
		 * 获取缓存数据
		 * @return {[type]} [description]
		 */
		getCacheData: function() {
			return this._cacheData;
		},

		/**
		 * 获取组件jQuery对象
		 * @return {[type]} [description]
		 */
		getContainer: function() {
			return this._$container;
		},

		/**
		 * 获取文本输入框jQuery对象
		 * @return {[type]} [description]
		 */
		getInput: function() {
			return this._$targetInput;
		},

		getInputBox: function() {
			return this._$inputBox;
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
		 * 通过索引获取缓存数据
		 * @return {[type]} [description]
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
		 * 默认配置项
		 * @type {Object}
		 */
		_defaultOption: {
			$element: null,//必填,可传selector或jQuery对象
			disabled: true,//默认组件可用
			timeout: 600000,//异步请求超时时间10分钟
			loadingImg: null,//选填,搜索时是否需要显示加载图标,传入的是加载图标的路径
			hiddenFiled: null,//选填,是否需要添加hidden表单 i.e.{name:"companyId"}
			selectedCallback: null,//选填,选中搜索结果项回调函数
			//必填,搜索有关配置项
			remote: {
				url: "",//搜索请求地址
				requestType: "get",//请求方式支持getJSON/get/post,若要实现JSONP则向url添加查询参数callback=?
				parse: null,//结果数据的预处理函数,不同的后台返回的数据格式不同,该函数可以实现数据格式及字段一致
				paramName: "keyword",//参数名称
				extraParam: null,//额外参数 可以是对象或函数
				emptyData: "没有匹配的内容",//没有搜索到数据
				searchError: "搜索失败请稍后重试"//搜索失败提示
			}
		},

		/**
		 * 初始化
		 * @param  {[type]} options 配置参数
		 * @return {[type]}
		 */
		_init: function( options ) {
			var that = this;

			that._options = $.extend( true, {}, that._defaultOption, options );
			that._cacheParam()
				._initComponent()
				._bindEventListener();
		},

		/**
		 * 初始化组件
		 * @return {[type]} [description]
		 */
		_initComponent: function() {
			var $target,
				cloneNodes,
				$container,
				that = this,
				target = that._$element;

			if ( target.jquery ) {
				$target = target;
			}else {
				$target = $( target );
			}
			if ( !$target || !$target.length ) {
				$.error( "初始化时，请传入$target参数" );
			}else {
				cloneNodes = [
					$target
						.clone()
						.removeAttr( "id name placeholder" )
						.addClass( "auto-complete-input" ),
					$target
						.clone()
						.prop( "readonly", true )
						.addClass( "auto-complete-target" )
				];
				$container = $( TEMPLATE.autocomplete );
				if ( cloneNodes[ 1 ].prop( "disabled" ) ) {
					cloneNodes[ 1 ].prop( "readonly", false );
				}
				$.each( cloneNodes, function() {
					$container.append( this );
				} );
				$target.replaceWith( $container );
				that._$inputBox = $container.find( ".auto-complete-input" );
				that._$targetInput = $container.find( ".auto-complete-target" );
				that._$dropdownMenu = $( TEMPLATE.dropdownMenu ).appendTo( document.body );
				that._$container = $container.attr( "id", ( that._containerId = PREFIX + "-" + ( $.cowboy.GUID++ ) ) );
				that._createHiddenFiled()._createLoading();
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

			$targetInput
				.show()
				.prop( "readonly", false )
				.removeClass( "auto-complete-target" );
			that._$container.replaceWith( $targetInput );

			return that;
		},

		/**
		 * 设置下拉菜单位置,相对于body定位
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
		 * @return {[type]} [description]
		 */
		_createHiddenFiled: function() {
			var selector,
				hiddenName,
				$hiddenFiled,
				that = this,
				hiddenConfig = that._hiddenFiled;

			if ( hiddenConfig && ( hiddenName = $.trim( hiddenConfig.name ) ) ) {
				selector = "input[name=\"" + hiddenName + "\"]";
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
			var $loading,
				$container,
				that = this,
				loadingImg = that._loadingImg;

			if ( loadingImg ) {
				$container = that._$container;
				$loading = $container.find( ".autocomplete-loading" );
				if ( $loading.length ) {
					that._$loading = $loading;
				}else {
					$loading = that._$loading = $( Mustache.render( TEMPLATE.loading, {
						loadingImg: loadingImg
					} ) ).prependTo( $container );
					$loading.css( {
						left: that._$targetInput.outerWidth( true ) - 16
					} );
				}
			}else {
				that._$loading = $( {} );
			}

			return that;
		},

		/**
		 * 缓存常用参数
		 * @return {[type]} [description]
		 */
		_cacheParam: function() {
			var property,
				that = this,
				options = that._options;

			for ( property in options ) {
				that[ "_" + property ] = options[ property ];
			}
			that._timer = {};//存储需要使用的计时器
			that._events = $( {} );//初始化自定义事件对象
			that._cacheData = null;//数据缓存

			return that;
		},

		/**
		 * 绑定事件
		 * @return {[type]} [description]
		 */
		_bindEventListener: function() {
			var that = this,
				prefix = that._containerId,
				inputBox = ".auto-complete-input",
				targetInput = ".auto-complete-target",
				eventCallbacks = that._eventCallbacks;

			that._$container
				.off( "." + prefix )
				.on( "click." + prefix, targetInput, function( e ) {
					eventCallbacks.clickTargetInput.call( that, e, $( this ) );
				} )
				.on( "keydown." + prefix, inputBox, function( e ) {
					eventCallbacks.keydownInputbox.call( that, e, $( this ) );
				} )
				.on( "keyup." + prefix, inputBox, function( e ) {
					eventCallbacks.changeInputBox.call( that, e, $( this ) );
				} );

			that._$dropdownMenu
				.off( "." + prefix )
				.on( "click." + prefix, "li", function( e ) {
					eventCallbacks.clickDropdownMenuItem.call( that, e, $( this ) );
				} );

			$( window )
				.off( "." + prefix )
				.on( "resize." + prefix, function( e ) {
					eventCallbacks.windowResize.call( that, e, $( this ) );
				} );

			return that;
		},

		/**
		 * 选中搜索下拉项
		 * @param  {[type]} value [description]
		 * @return {[type]}       [description]
		 */
		_selectResult: function( value, $target ) {
			var that = this,
				data = that._cacheData[ $target.closest( "ul" ).children().index( $target ) ];

			that._$targetInput.val( value.text );
			if ( that._$hiddenFiled ) {
				that._$hiddenFiled.val( value.value );//若有hidden表单域则设置值
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
				$current = $dropdownMenu.find( "." + CLASS_NAME.ACTIVE_CLASS_NAME );
				if ( $current.length ) {
					$current.removeClass( CLASS_NAME.ACTIVE_CLASS_NAME );
					if ( isUp ) {
						$current = $current.prev();
						while ( $current.length && $current.hasClass( CLASS_NAME.DISABLED_CLASS_NAME ) ) {
							$current = $current.prev();
						}
						if ( !$current.length ) {
							$current = $dropdownMenuItems.last();
						}
					}else {
						$current = $current.next();
						while ( $current.length && $current.hasClass( CLASS_NAME.DISABLED_CLASS_NAME ) ) {
							$current = $current.next();
						}
						if ( !$current.length ) {
							$current = $dropdownMenuItems.first();
						}
					}
				}else {
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
				._abortSearchPromise();

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
			promise = that._searchPromise  = $.ajax( {
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
							text: remote.emptyData
						};
						that._cacheData = null;
					}
				} )
				.fail( function( jqXHR, textStatus ) {
					if ( textStatus !== "abort" ) {
						modal = {
							text: remote.searchError
						};
					}
					that._cacheData = null;//清空缓存数据
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
			var that = this,
				$dropdownItems,
				$dropdownMenu = that._$dropdownMenu;

			if ( modal ) {
				$dropdownMenu.html( Mustache.render( tpl, modal ) );
				$dropdownItems = $dropdownMenu.find( "li" ).not( "." + CLASS_NAME.DISABLED_CLASS_NAME );
				if ( $dropdownItems.length === 1 ) {
					$dropdownItems.addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
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
		 * 显示输入框
		 * @return {[type]} [description]
		 */
		_showInputBox: function() {
			var that = this,
				$inputBox = that._$inputBox;

			that._clearTimer( "hideInputTimer" );
			$inputBox.val( "" ).show().focus();
			$( document )
				.off( "." + that._containerId )
				.on( "click." + that._containerId, function( e ) {
					that._eventCallbacks.clickOthers.call( that, e, $( e.target ) );
				} );

			return that;
		},

		/**
		 * 隐藏输入框
		 * @param  {[type]} delay 延时时长
		 */
		_hideInputBox: function( delay, excuteFunc ) {
			var that = this,
				hide = function() {
					$.each( [
						"inputBox",
						"dropdownMenu"
					], function( i, item ) {
						var $target = that[ "_$" + item ];
						if ( item === "inputBox" ) {
							$target.val( "" );
						}else if ( item === "dropdownMenu" ) {
							$target.html( "" ).scrollTop( 0 );
						}
						$target.hide();
					} );
				};

			delay = delay || 0;
			that._clearTimer( "hideInputTimer" );//先清空计时器
			if ( delay ) {
				//若传入延时时长大于0则重新设定计时器
				that._timer.hideInputTimer = setTimeout( function() {
					excuteFunc && excuteFunc.call( that );
					hide();
				}, delay );
			}else {
				hide();//否则直接隐藏
			}
			$( document ).off( "." + that._containerId );

			return that;
		},

		/**
		 * 清空计时器
		 * @param  {[type]} name 计时器名称,若不传则清空所有
		 * @return {[type]}      [description]
		 */
		_clearTimer: function( name ) {
			var that = this,
				timer = that._timer;

			if ( name && timer[ name ] != null ) {
				clearTimeout( timer[ name ] );
				that._timer[ name ] = null;
			}else if ( name == null ) {
				for ( var key in timer ) {
					if ( timer[ key ] != null ) {
						clearTimeout( timer[ key ] );
						that._timer[ key ] = null;
					}
				}
			}

			return that;
		},

		/**
		 * 终止搜索请求
		 * @return {[type]} [description]
		 */
		_abortSearchPromise: function() {
			var that = this;

			if ( that._searchPromise ) {
				that._searchPromise.abort();
				that._searchPromise = null;
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
					that._hideInputBox( 0 );//点击其他地方直接隐藏
				}
			},

			/**
			 * 输入框失去焦点事件处理
			 * @return {[type]} [description]
			 */
			focusoutInputBox: function() {
				var that = this;

				that._hideInputBox( DELAY_TIME.HIDE_INPUT_BOX, function() {
					this._$dropdownMenu.find( "." + CLASS_NAME.ACTIVE_CLASS_NAME ).click();
				} );
			},

			/**
			 * 输入框按钮事件回调
			 * @param  {[type]} e       [description]
			 * @return {[type]}         [description]
			 */
			keydownInputbox: function( e ) {
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
			 * 目标框单击事件处理
			 * @return {[type]} [description]
			 */
			clickTargetInput: function( e, $target ) {
				var that = this;

				if ( !( $target.prop( "disabled" ) || $target.hasClass( "disabled" ) || that._disbled ) ) {
					that._showInputBox();
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
					that._$dropdownMenu.find( "." + CLASS_NAME.ACTIVE_CLASS_NAME ).removeClass( CLASS_NAME.ACTIVE_CLASS_NAME );
					$target.addClass( CLASS_NAME.ACTIVE_CLASS_NAME );
					that._selectResult( {
						value: $.trim( $target.data( "value" ) ),
						text: $.trim( $target.data( "text" ) || $target.text() )
					}, $target );
				}
				that._hideInputBox( 0 );
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
			 * 鼠标移入dropdownMenu
			 * @return {[type]} [description]
			 */
			mousenterDropdownMenu: function() {
				var that = this;
				that._clearTimer( "hideInputTimer" );
			},

			/**
			 * 鼠标移出dropdownMenu
			 * @return {[type]} [description]
			 */
			mouseleaveDropdownMenu: function() {
				var that = this;
				that._hideInputBox( 0 );
			},

			/**
			 * 窗口重置
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

	$.cowboy.plugin( AutoCompleteSelector ); //暴露组件并转成jQuery插件
} ) );
