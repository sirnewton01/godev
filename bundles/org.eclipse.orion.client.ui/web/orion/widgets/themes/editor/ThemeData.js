/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global widgets orion window console define localStorage ActiveXObject DOMParser*/
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'orion/editor/textTheme'], 
	function(messages, mTextTheme) {
	
		/* Synchronizing colors and styles for HTML, CSS and JS files like this ...
	
			Using Prospecto as an example:
			
			-----------------------------------------------
							CSS			HTML		JS
			-----------------------------------------------
			ORANGE			Class		Tag			Keyword
			darkSlateGray	Text		Text		Text
			darkSeaGreen	Comments	Comments	Comments
			cornFlowerblue	String		String		String
			----------------------------------------------- */
	

		function StyleSet(){
		
		}
		
		function multiply(a,b){
			var resultString = 'Result:';
			var result = a*b;
			return resultString + result;
		}
		
		var defaultFont = '"Consolas", "Monaco", "Vera Mono", "monospace"';
		var defaultFontSize = '10pt';

		function ThemeData() {

		this.styles = [];

		var eclipse = new StyleSet();

		eclipse.name = 'Eclipse';
		eclipse.annotationRuler = 'white';
		eclipse.background = 'white';
		eclipse.comment = 'green';
		eclipse.keyword = '#7f0055';
		eclipse.text = 'darkSlateGray';
		eclipse.string = 'blue';
		eclipse.overviewRuler = 'white';
		eclipse.lineNumberOdd = '#444';
		eclipse.lineNumberEven = '#444';
		eclipse.lineNumber = '#444';
		eclipse.currentLine = '#EAF2FE';
		eclipse.tag = 'darkorange';
		eclipse.attribute = 'cadetBlue';
		eclipse.fontFamily = defaultFont;
		eclipse.fontSize = defaultFontSize;

		this.styles.push(eclipse);

		var prospecto = new StyleSet();

		prospecto.name = 'Prospecto';
		prospecto.annotationRuler = 'white';
		prospecto.background = 'white';
		prospecto.comment = '#3C802C';
		prospecto.keyword = '#CC4C07';
		prospecto.text = '#333';
		prospecto.string = '#446FBD';
		prospecto.overviewRuler = 'white';
		prospecto.lineNumberOdd = 'silver';
		prospecto.lineNumberEven = 'silver';
		prospecto.lineNumber = 'silver';
		prospecto.currentLine = '#EAF2FE';
		prospecto.tag = '#CC4C07';
		prospecto.attribute = 'cadetBlue';
		prospecto.fontFamily = defaultFont;
		prospecto.fontSize = defaultFontSize;


		this.styles.push(prospecto);

		var blue = new StyleSet();

		blue.name = 'Blue';
		blue.annotationRuler = 'lavender';
		blue.background = 'aliceBlue';
		blue.comment = 'indigo';
		blue.keyword = 'cornFlowerBlue';
		blue.text = 'navy';
		blue.string = 'cornFlowerBlue';
		blue.overviewRuler = 'lavender';
		blue.lineNumberOdd = 'darkSlateGray';
		blue.lineNumberEven = 'darkSlateGray';
		blue.lineNumber = 'darkSlateGray';
		blue.currentLine = 'white';
		blue.tag = 'cornFlowerBlue';
		blue.attribute = 'cadetBlue';
		blue.fontFamily = defaultFont;
		blue.fontSize = defaultFontSize;

		this.styles.push(blue);

		var ambience = new StyleSet();

		ambience.name = 'Ambience';
		ambience.annotationRuler = '#3D3D3D';
		ambience.background = '#202020';
		ambience.comment = 'mediumslateblue';
		ambience.keyword = 'cornFlowerBlue';
		ambience.text = 'darkseagreen';
		ambience.string = 'lightcoral';
		ambience.overviewRuler = 'white';
		ambience.lineNumberOdd = 'black';
		ambience.lineNumberEven = 'black';
		ambience.lineNumber = 'black';
		ambience.currentLine = 'lightcyan';
		ambience.tag = 'cornFlowerBlue';
		ambience.attribute = 'cadetBlue';
		ambience.fontFamily = defaultFont;
		ambience.fontSize = defaultFontSize;

		this.styles.push(ambience);

		var tierra = new StyleSet();

		tierra.name = 'Tierra';
		tierra.annotationRuler = 'moccasin';
		tierra.background = 'lemonchiffon';
		tierra.comment = 'darkseagreen';
		tierra.keyword = 'darkred';
		tierra.text = '#555555';
		tierra.string = 'orangered';
		tierra.overviewRuler = 'moccasin';
		tierra.lineNumberOdd = 'chocolate';
		tierra.lineNumberEven = 'chocolate';
		tierra.lineNumber = 'chocolate';
		tierra.currentLine = '#baa289';
		tierra.tag = 'darkred';
		tierra.attribute = 'cadetBlue';
		tierra.fontFamily = defaultFont;
		tierra.fontSize = defaultFontSize;

		this.styles.push(tierra);

		var nimbus = new StyleSet();

		nimbus.name = 'Nimbus';
		nimbus.annotationRuler = '#444';
		nimbus.background = 'dimgray';
		nimbus.comment = 'darkseagreen';
		nimbus.keyword = 'darkorange';
		nimbus.text = 'white';
		nimbus.string = 'cornflowerblue';
		nimbus.overviewRuler = '#444';
		nimbus.lineNumberOdd = '#aaa';
		nimbus.lineNumberEven = '#aaa';
		nimbus.lineNumber = '#aaa';
		nimbus.currentLine = '#aabfbb';
		nimbus.tag = 'darkorange';
		nimbus.attribute = 'cadetBlue';
		nimbus.fontFamily = defaultFont;
		nimbus.fontSize = defaultFontSize;

		this.styles.push(nimbus);

		var adelante = new StyleSet();

		adelante.name = 'Adelante';
		adelante.annotationRuler = '#E2D2B2';
		adelante.background = '#F1E7C8';
		adelante.comment = '#5D774E';
		adelante.keyword = '#AF473B';
		adelante.text = 'dimgray';
		adelante.string = '#DE5D3B';
		adelante.overviewRuler = '#E2D2B2';
		adelante.lineNumberOdd = '#AF473B';
		adelante.lineNumberEven = '#AF473B';
		adelante.lineNumber = '#AF473B';
		adelante.currentLine = '#9e937b';
		adelante.tag = '#AF473B';
		adelante.attribute = 'cadetBlue';
		adelante.fontFamily = defaultFont;
		adelante.fontSize = defaultFontSize;

		this.styles.push(adelante);

		var raspberry = new StyleSet();

		raspberry.name = 'Raspberry Pi';
		raspberry.annotationRuler = 'seashell';
		raspberry.background = 'seashell';
		raspberry.comment = '#66B32F';
		raspberry.keyword = '#E73E36';
		raspberry.text = 'dimgray';
		raspberry.string = 'darkorange';
		raspberry.overviewRuler = 'seashell';
		raspberry.lineNumberOdd = '#E73E36';
		raspberry.lineNumberEven = '#E73E36';
		raspberry.lineNumber = '#E73E36';
		raspberry.currentLine = '#F5B1AE';
		raspberry.tag = '#E73E36';
		raspberry.attribute = 'cadetBlue';
		raspberry.fontFamily = defaultFont;
		raspberry.fontSize = defaultFontSize;

		this.styles.push(raspberry);

		}
		
		function getStyles(){
			return this.styles;
		}
		
		ThemeData.prototype.styles = [];
		ThemeData.prototype.getStyles = getStyles;
		
		var fontSettable = true;
		
		ThemeData.prototype.fontSettable = fontSettable;
		
		function getThemeStorageInfo(){
			var themeInfo = { storage:'/themes', styleset:'editorstyles', defaultTheme:'Prospecto', selectedKey: 'editorSelected' }; 
			return themeInfo;
		}

		ThemeData.prototype.getThemeStorageInfo = getThemeStorageInfo;

		function getViewData() {

		var dataset = {};
		dataset.top = 10;
		dataset.left = 10;
		dataset.width = 400;
		dataset.height = 350;

		var LEFT = dataset.left;
		var TOP = dataset.top;

		dataset.shapes = [{
			type: 'TEXT',
			name: messages["Line Numbers"],
			label: '1',
			x: LEFT + 20,
			y: TOP + 20,
			fill: 'darkSlateGray',
			family: 'lineNumber',
			font: '9pt sans-serif'
		},
		{
			type: 'RECTANGLE',
			name: messages.Background,
			x: LEFT + 46,
			y: TOP,
			width: 290,
			height: dataset.height,
			family: 'background',
			fill: 'white'
		},
		{
			type: 'TEXT',
			name: messages.Strings,
			label: "'text/javascript'",
			x: LEFT + 134,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'string',
			font: '9pt sans-serif'
		},
		
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '=',
			x: LEFT + 124,
			y: TOP + 20,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},

		
		{
			type: 'RECTANGLE',
			name: messages["Current Line"],
			x: LEFT + 46,
			y: TOP + 87,
			width: 290,
			height: 18,
			family: 'currentLine',
			fill: '#eaf2fd'
		},
		
		{
			type: 'TEXT',
			name: messages["HTML Attribute"],
			label: 'type',
			x: LEFT + 98,
			y: TOP + 20,
			fill: 'darkGray',
			family: 'attribute',
			font: '9pt sans-serif'
		},
		
		{
			type: 'RECTANGLE',
			name: messages["Overview Ruler"],
			x: LEFT + 336,
			y: TOP,
			width: 14,
			height: dataset.height,
			family: 'overviewRuler',
			fill: 'white'
		},	
		{
			type: 'TEXT',
			name: messages.Comments,
			label: '/* comment */',
			x: LEFT + 75,
			y: TOP + 40,
			fill: 'darkSeaGreen',
			family: 'comment',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '<script',
			x: LEFT + 55,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '>',
			x: LEFT + 213,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Strings,
			label: '\'Result\'',
			x: LEFT + 164,
			y: TOP + 80,
			fill: 'cornflowerBlue',
			family: 'string',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'multiply(a,b){',
			x: LEFT + 120,
			y: TOP + 60,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		
		{
			type: 'TEXT',
			name: messages.Keywords,
			label: 'function',
			x: LEFT + 75,
			y: TOP + 60,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Keywords,
			label: 'var',
			x: LEFT + 95,
			y: TOP + 80,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'output = ',
			x: LEFT + 115,
			y: TOP + 80,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ';',
			x: LEFT + 205,
			y: TOP + 80,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Keywords,
			label: 'var',
			x: LEFT + 95,
			y: TOP + 100,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'result = a*b;',
			x: LEFT + 115,
			y: TOP + 100,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Keywords,
			label: 'return',
			x: LEFT + 95,
			y: TOP + 120,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'output + result;',
			x: LEFT + 135,
			y: TOP + 120,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '}',
			x: LEFT + 75,
			y: TOP + 140,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '</script>',
			x: LEFT + 55,
			y: TOP + 160,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '<style',
			x: LEFT + 55,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Attribute"],
			label: 'type',
			x: LEFT + 95,
			y: TOP + 200,
			fill: 'darkGray',
			family: 'attribute',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '=',
			x: LEFT + 121,
			y: TOP + 200,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Strings,
			label: "'text/css'",
			x: LEFT + 131,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'string',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '>',
			x: LEFT + 180,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Class Name"],
			label: '.some-class',
			x: LEFT + 75,
			y: TOP + 220,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Class Name"],
			label: '{',
			x: LEFT + 145,
			y: TOP + 220,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Attribute"],
			label: 'color:',
			x: LEFT + 95,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Value"],
			label: '#123456',
			x: LEFT + 130,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'string',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Text"],
			label: ';',
			x: LEFT + 180,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["CSS Class Name"],
			label: '}',
			x: LEFT + 75,
			y: TOP + 260,
			fill: 'darkSlateGray',
			family: 'text',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["HTML Tag"],
			label: '</style>',
			x: LEFT + 55,
			y: TOP + 280,
			fill: 'darkorange',
			family: 'keyword',
			font: '9pt sans-serif'
		},
		/* <style type='text/css'></style> */
		{
			type: 'RECTANGLE',
			name: messages["Annotation Ruler"],
			x: LEFT,
			y: TOP,
			width: 46,
			height: dataset.height,
			family: 'annotationRuler',
			fill: 'white'
		}];

		for (var line = 0; line < 16; line++) {
			dataset.shapes.push({
				type: 'TEXT',
				name: messages["Line Numbers"],
				label: line + 1,
				x: LEFT + 20,
				y: TOP + (20 * line) + 20,
				fill: 'darkSlateGray',
				family: 'lineNumber',
				font: '9pt sans-serif'
			});
		}

		return dataset;
	}
		
		function parseToXML ( text ) {
		      try {
		        var xml = null;
		        
		        if ( window.DOMParser ) {
		
		          var parser = new DOMParser();
		          xml = parser.parseFromString( text, "text/xml" );
		          
		          var found = xml.getElementsByTagName( "parsererror" );
		
		          if ( !found || !found.length || !found[ 0 ].childNodes.length ) {
		            return xml;
		          }
		
		          return null;
		        } else {
		
		          xml = new ActiveXObject( "Microsoft.XMLDOM" );
		
		          xml.async = false;
		          xml.loadXML( text );
		
		          return xml;
		        }
		      } catch ( e ) {
		        // suppress
		      }
		 }
		 
		ThemeData.prototype.parseToXML = parseToXML;
		
		function selectFontSize( size ){
			console.log( 'fontsize: ' + size );
		}
		
		ThemeData.prototype.selectFontSize = selectFontSize;
		
		function importTheme(data){
			console.log( 'import theme' );
			console.log( data );
			
			var body = data.parameters.valueFor("name");
				
			var xml = this.parseToXML( body );
			
			var newStyle = new StyleSet();
			
			newStyle.name = xml.getElementsByTagName("colorTheme")[0].attributes[1].value;
			newStyle.annotationRuler = xml.getElementsByTagName("background")[0].attributes[0].value; 
			newStyle.background = xml.getElementsByTagName("background")[0].attributes[0].value;
			newStyle.comment = xml.getElementsByTagName("singleLineComment")[0].attributes[0].value;
			newStyle.keyword = xml.getElementsByTagName("keyword")[0].attributes[0].value;
			newStyle.text = xml.getElementsByTagName("foreground")[0].attributes[0].value;
			newStyle.string = xml.getElementsByTagName("string")[0].attributes[0].value;
			newStyle.overviewRuler = xml.getElementsByTagName("background")[0].attributes[0].value;
			newStyle.lineNumberOdd = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
			newStyle.lineNumberEven = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
			newStyle.lineNumber = xml.getElementsByTagName("lineNumber")[0].attributes[0].value;
			newStyle.currentLine = xml.getElementsByTagName("selectionBackground")[0].attributes[0].value;
			
			data.items.addTheme( newStyle );
		}
		
		ThemeData.prototype.importTheme = importTheme;
		
		function processSettings( settings, preferences ){
			var themeClass = "editorTheme";
			var theme = mTextTheme.TextTheme.getTheme();
			theme.setThemeClass(themeClass, theme.buildStyleSheet(themeClass, settings));
		}

		ThemeData.prototype.processSettings = processSettings;

		ThemeData.prototype.getViewData = getViewData;

		return{
			ThemeData:ThemeData,
			getStyles:getStyles
		};
	}
);