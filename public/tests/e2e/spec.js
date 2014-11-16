describe('twitter home page', function(){
    var prot = protractor.getInstance();
    var url = 'http://localhost:3000';
    prot.ignoreSynchronization = true;

    beforeEach(function(){
        prot.sleep(200);
    });

    it('login check', function(){
        prot.get(url);
        expect(prot.getTitle()).toBe('ColdCast Webapp');
    });

});