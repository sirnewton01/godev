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
/*global define document TextEncoder TextDecoder Uint8Array unescape escape*/


define(["orion/assert", "orion/encoding-shim", "domReady!"], function(assert) {
	var tests = {};

	var bigtest = "\uD83D\uDCA9Bâｃòл ïｐѕûｍ ｄòɭòｒ ｓìｔ àｍèｔ ѕｈ߀ｕɭｄèｒ ɭáƅｏｒïѕ ρａｒíɑｔüｒ êｔ ｄòｌｏｒ ρäԉｃéｔｔá ɦɑϻ ûｔ. Màǥｎã ｃòｎѕｅｃｔｅｔúｒ ｓｈｏúｌｄéｒ ｃ߀ｍϻòԁｏ ｍｉԉïϻ ｔéԉｄèｒɭｏíｎ. Còｎｓèｑüåｔ áｄｉρìｓïｃｉｎǥ ｔúｒᏧüｃｋêл ｔêԉｄêｒɭ߀ｉԉ ｆìɭèｔ ｍｉɢлｏｎ ｃɦíｃƙｅл. Aüｔë âᏧ ｅХｅｒｃｉｔàｔìòл Ꮷêѕｅｒûԉｔ ߀ｆｆïｃíâ. Pòｒƙ ｌｏｉｎ ｂåｌɭ ｔïｐ ｓｔｒìｐ ѕｔｅàｋ, ｐïɢ ｓհｏùｌԁëｒ ｃ߀ｎѕｅｃｔêｔùｒ ｊêｒｋｙ ѕïлｔ ｌéƃêｒƙáｓ ｒｉƅｅｙë ѵòɭûｐｔàｔê üｌɭàϻｃ߀.Bèëｆ ｒíƃｓ յèｒƙｙ ｄéѕëｒúｎｔ ƙïéɭƃäｓá. Lɑƃòｒïｓ úｔ ƃéｅｆ ｔ-ｂ߀ԉè ｓｔｒｉｐ ｓｔｅɑƙ êｓｔ. Dｒúϻѕｔíｃƙ ƃｉɭｔ߀ｎｇ հäｍƃｕｒɢｅｒ, ԉòԉ ｃíɭｌûϻ ｃüｌｐɑ ｔùｒƙéϒ ѕïԉｔ ｅíûѕϻ߀Ꮷ лûｌɭá åлïｍ ａԉԁ߀ûｉɭｌｅ. Sｈｏｒｔ ｒｉƃѕ òｆｆïｃｉà ｌãｂｏｒê ｃｈìｃƙéｎ ｃｏｗ. Càｐｉｃòｌａ éú ｄｕïѕ úｔ ｆíｌｅｔ ϻｉｇԉ߀л ѕûｎｔ. Mｅɑｔƅâｌｌ ƃｒèѕáòｌａ ｆｌáԉƙ ｃɦìｃƙêｎ ｃ߀ｒԉèᏧ ｂéｅｆ, ｆûɢìäｔ ｔｏｎｇüｅ ｓｔｒíρ ｓｔｅãｋ ｅх.AԉᏧòùｉɭɭê ｌàｂòｒｅ ϻｅáｔɭｏãｆ éх ｆｌáｎƙ, ｆａｔｂâｃｋ ｓｉｒɭｏïԉ ｂｒìѕƙéｔ ɭêƅêｒƙａｓ. Eú ƅíɭｔòлɢ ｓｉｎｔ ԉｏｓｔｒüԁ ѕհｏûɭｄêｒ âｌíɋùìｐ, ԁｏ ｓúԉｔ íлｃìᏧïԁûｎｔ ｊëｒƙϒ ｔêϻｐ߀ｒ ѕëｄ. Cｏԉｓéɋúãｔ ｓｈåлƙ ｄｅｓèｒｕԉｔ ｆｒɑԉｋｆüｒｔｅｒ ρｒｏíｄèлｔ ɭâｂｏｒè ｃｕｌｐå ｔｅлｄêｒɭ߀ìԉ. Aｌíɋùíｐ ｔùｒｋéϒ ëâ ｉԉ ｓɯìｎｅ ｐｏｒｋ ｌｏｉԉ ρｏｒｋ ƃｅɭｌｙ Ꮷｏɭ߀ｒé ɦäｍ հ߀ｃƙ ａúｔｅ. Pｒｏíｄèԉｔ ｃòɯ ɭäƃｏｒè éХ íｄ. Dòｌ߀ｒ ԁ߀ ѕհ߀ｒｔ ｌ߀ｉԉ, ｃòԉѕëɋûåｔ ｍìлｉｍ ｐáԉｃëｔｔâ ｔãｉｌ ѕüлｔ ԁòɭ߀ｒｅ ϻàǥｎá ｖｏɭúｐｔɑｔê ρ߀ｒｋ ƅèｌｌｙ ëｔ ｆｒａлƙｆｕｒｔｅｒ ｔúｒｋêｙ. Dｕｉѕ ｐɑѕｔｒａｍí ƅòúｄｉл ｂɑｃ߀ｎ ｃãｐíｃòｌâ, ｒíｂëϒê ԁ߀ ϻéàｔｂåɭɭ êХｃèｐｔèｕｒ ëｓｔ ԉòｓｔｒｕｄ ëѕѕｅ ｐâｒïɑｔｕｒ.";
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;
	bigtest+=bigtest;


	tests.testBasic = function() {
		var encoder = new TextEncoder();
		var encoded = encoder.encode(bigtest);
		
		var decoder = new TextDecoder();
		var decoded = decoder.decode(encoded);
		
		assert.equal(decoded, bigtest);		
	};
	
	tests.testBOM = function() {
		var encoder = new TextEncoder();
		var encoded = encoder.encode("\uFEFFabc\uD83D\uDCA9");
		
		var decoder = new TextDecoder();
		var decoded = decoder.decode(encoded);
		
		assert.equal(decoded, "abc\uD83D\uDCA9");		
	};
	
	
	tests.xtesturiBasic = function() {
		function encode_utf8(s) {
		  return unescape(encodeURIComponent(s));
		}
		
		function decode_utf8(s) {
		  return decodeURIComponent(escape(s));
		}
				
		var encoded = encode_utf8(bigtest);
		var decoded = decode_utf8(encoded);
		
		assert.equal(decoded, bigtest);
		//console.log(decoded.length);
	};
	
	tests.testStreamEncoder = function() {
		var test = "Vìêｔ Nａｍ\uFFFD";
		var encoder = new TextEncoder();
		
		var buf, count = 0;
		var bufs = test.split("").map(function(c) {
			buf = encoder.encode(c,{stream:true});
			count += buf.length;
			return buf;
		});
		buf = encoder.encode();
		count += buf.length;
		bufs.push(buf);
		
		var actual = new Uint8Array(count);
		var offset = 0;
		bufs.forEach(function(b) {
			actual.set(b, offset);
			offset+=b.length;
		});
		var expected = encoder.encode(test);
		assert.equal(actual.length, expected.length);
		for (var i = 0; i < actual.length;i++) {
			assert.equal(actual[i], expected[i]);			
		}
	};

	tests.testStreamDecoder = function() {
		var test = "Vìêｔ Nａｍ\uFFFD";
		var encoder = new TextEncoder();
		var decoder = new TextDecoder();
		var buf;
		var decoded = "";

		test.split("").forEach(function(c) {
			var buf = encoder.encode(c,{stream:true});
			decoded += decoder.decode(buf, {stream:true});
		});
		buf = encoder.encode();
		decoded += decoder.decode(buf);
		
		assert.equal(decoded, test);
	};

	return tests;
});