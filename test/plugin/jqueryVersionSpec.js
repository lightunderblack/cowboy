describe("$.cowboy", function(){
	it("The $.cowboy defined", function(){
		expect($.cowboy).toBeDefined();
	});

	it("The $.cowboy.plugins defined", function(){
		expect($.cowboy.plugins).toBeDefined();
	});	

	it("The $.cowboy.GUID defined", function(){
		expect($.cowboy.GUID).toBeDefined();
	});

	it("The $.cowboy.GUID is zero", function(){
		expect($.cowboy.GUID).toBe(0);
	});	
});