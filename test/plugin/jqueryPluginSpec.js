describe("$.cowboy.plugin", function(){
	describe("defined", function(){
		it("The $.cowboy.plugin defined", function(){
			expect($.cowboy.plugin).toBeDefined();
		});
		it("The $.cowboy.plugin is function", function(){
			expect(typeof($.cowboy.plugin)).toBe("function");
		});	
		it("The $.cowboy.isPluginExisten defined", function(){
			expect($.cowboy.isPluginExisten).toBeDefined();
		});
		it("The $.cowboy.isPluginExisten is function", function(){
			expect(typeof($.cowboy.isPluginExisten)).toBe("function");
		});
	});

	describe("function", function(){
		var instance;
		var prefixName;
		var pluginName;
		var PluginConstructor;

		beforeEach(function(){
			prefixName = "cowboy-"
			pluginName = "jasmineTestCowboy";
	 		PluginConstructor = function(option){	
	 			this._init(option);
			};
			$.extend(PluginConstructor.prototype, {
				_init: function(option){

				}
			});
		});

		afterEach(function() {
			$.fn[ pluginName ] = null;
			$.cowboy.plugins[pluginName] = null;
			delete $.fn[pluginName];
			delete $.cowboy.plugins[pluginName];
		});			

		it("call with two paramters", function(){
			$.cowboy.plugin(pluginName, PluginConstructor);//组件插件化
			expect($.cowboy.plugins[pluginName]).toBeDefined();//是否定义
			expect($.fn[pluginName]).toBeDefined();//是否定义
		});

		it("call with one paramters", function(){
			$.extend(PluginConstructor.prototype, {
				fullName: pluginName
			});
			$.cowboy.plugin(PluginConstructor);//组件插件化
			expect($.cowboy.plugins[pluginName]).toBeDefined();//是否定义
			expect($.fn[pluginName]).toBeDefined();//是否定义
		});	

		it("call data", function(){
			//载入DOM树
		    jasmine.getFixtures().fixturesPath = "base/view/plugin";
		    loadFixtures("jqueryPlugin.html");	

			$.extend(PluginConstructor.prototype, {
				fullName: pluginName
			});		   	
		    $.cowboy.plugin(pluginName, PluginConstructor);//组件插件化
		    instance = $("#pluginDataTest")[pluginName]().data(prefixName + pluginName.toLowerCase());//初始化	

		    expect(instance).toBeDefined();//是否定义
		    expect(instance).not.toBeNull();//不等于null
		    expect(instance.fullName).toBe(pluginName);//校验实例化是否成功		
		});

		describe("protoype method", function(){
			beforeEach(function(){
				//载入DOM树
			    jasmine.getFixtures().fixturesPath = "base/view/plugin";
			    loadFixtures("jqueryPlugin.html");	
				$.extend(PluginConstructor.prototype, {
					fullName: pluginName,
					_init: function(option){
						this._option = $.extend(true, {}, option);
					},				
					getOptionByName: function(name){
						return this._option[name];
					}
				});		   	
			    $.cowboy.plugin(pluginName, PluginConstructor);//组件插件化
			});	

			afterEach(function() {
				$.fn[ pluginName ] = null;
				$.cowboy.plugins[pluginName] = null;
				delete $.fn[pluginName];
				delete $.cowboy.plugins[pluginName];
			});							

			it("one element call", function(){
				//初始化	
			    $("#pluginDataTest")[pluginName]({
			    	number: 100
			    });
			    expect($("#pluginDataTest")[pluginName]("getOptionByName", "number")).toBe(100);
			});			

			it("elements call", function(){
				$(".pluginDataTest")[pluginName]();//初始化	
			    expect($(".pluginDataTest")[pluginName]("getOptionByName", "number").length).toBe($(".pluginDataTest").length);//元素长度是否相同
			    expect($(".pluginDataTest")[pluginName]("getOptionByName", "number")).toEqual(jasmine.arrayContaining($(".pluginDataTest").map(function(){
			    	return $(this).data("number");
			    }).toArray()));
			});
		});	
	});	

});