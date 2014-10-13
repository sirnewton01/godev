/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define(["chai/chai", "orion/URITemplate", "orion/PageUtil"], function(chai, URITemplate, PageUtil) {
	var assert = chai.assert;
	
	var aResource = "http://localhost/a/resource";
	var uriTemplate = "http://localhost/a/b#{resource,params*}";
	var orionURITemplate = "http://localhost/a/b#{,resource,params*}";
	var keys = {"test":"pass","semi":";","dot":".","comma":","};
	var anEncodedResource = "http://localhost/a/resource/a%2520c%2Cabc,f";
	
	describe("Test pageUtils", function() {
		it("BasicResourceParameters", function() {
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + encodeURIComponent(aResource)).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource + ",a=1,b=2,test=pass").a, "1");
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource + ",a=1,b=2,test=pass").b, "2");
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource + ",a=1,b=2,test=pass").test, "pass");
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource + ",a=1,b=2,test=" + encodeURIComponent("p,a,s,s")).test, "p,a,s,s");
			assert.equal(PageUtil.matchResourceParameters("http://localhost#" + aResource + ",a=1,b=2,test=pass,resource=bad").resource, aResource);
		});
		
		it("LocationBasicResourceParameters", function() {
			try {
				window.location.hash = aResource;
				assert.equal(PageUtil.matchResourceParameters().resource, aResource);
				
				window.location.hash = encodeURIComponent(aResource);
				assert.equal(PageUtil.matchResourceParameters().resource, aResource);
		
				window.location.hash = aResource + ",a=1,b=2,test=pass";
				assert.equal(PageUtil.matchResourceParameters().a, "1");
				assert.equal(PageUtil.matchResourceParameters().b, "2");
				assert.equal(PageUtil.matchResourceParameters().test, "pass");
				
				window.location.hash = aResource + ",a=1,b=2,test=" + encodeURIComponent("p,a,s,s");
				assert.equal(PageUtil.matchResourceParameters().test, "p,a,s,s");
				
				window.location.hash = aResource + ",a=1,b=2,test=pass,resource=bad";
				assert.equal(PageUtil.matchResourceParameters().resource, aResource);
			} finally {
				window.location.hash = "";
			}
		});
	
		it("URITemplateResourceParameters", function() {		
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource})).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource, params: keys})).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource, params: keys})).test, keys.test);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource, params: keys})).semi, keys.semi);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource, params: keys})).dot, keys.dot);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: aResource, params: keys})).comma, keys.comma);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(uriTemplate).expand({resource: anEncodedResource})).resource, anEncodedResource);		
		});
			
		it("OrionURITemplateResourceParameters", function() {		
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource})).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource, params: keys})).resource, aResource);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource, params: keys})).test, keys.test);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource, params: keys})).semi, keys.semi);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource, params: keys})).dot, keys.dot);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: aResource, params: keys})).comma, keys.comma);
			assert.equal(PageUtil.matchResourceParameters(new URITemplate(orionURITemplate).expand({resource: anEncodedResource})).resource, anEncodedResource);
		});
	});
});
