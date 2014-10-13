/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	'i18n!orion/settings/nls/messages',
	'orion/editor/textTheme',
	'orion/widgets/themes/container/ThemeSheetWriter',
	'orion/widgets/themes/ThemeVersion'
],
	function(messages, mTextTheme, ThemeSheetWriter, THEMES_VERSION) {

	// *******************************************************************************
	//
	// If you change any styles in this file, you must increment the version number
	// in ThemeVersion.js.
	//
	// *******************************************************************************

		function StyleSet(){
		    //
		}
		
		function multiply(a,b){
			var resultString = 'Result:';
			var result = a*b;
			return resultString + result;
		}
		
		// TODO: what are these for? They just get overridden by ThemeData constructor
		StyleSet.prototype.name = messages['orionThemeName'];
		StyleSet.prototype.navbar = '#404648';
		StyleSet.prototype.button = '#EFEFEF';
		StyleSet.prototype.location = '#333';
		StyleSet.prototype.breadcrumb = '#3087B3';
		StyleSet.prototype.separator = '#333';
		StyleSet.prototype.selection = 'FEC';
		StyleSet.prototype.sidepanel = '#FBFBFB';
		StyleSet.prototype.mainpanel = 'white';
		StyleSet.prototype.toolpanel = 'white';
		StyleSet.prototype.navtext = '#bfbfbf';
		StyleSet.prototype.content = '#3087B3';
		StyleSet.prototype.search = '#444';
		StyleSet.prototype.bannerProgress = "white";

		function ThemeData(){
		
			this.styles = [];
			
			var orion = new StyleSet();
			orion.name = messages['orionThemeName'];
			orion.navbar = 'white'; // #404648 for dark banner
			orion.button = '#EFEFEF';
			orion.location = '#efefef';
			orion.selection = 'FEC';
			orion.sidepanel = '#FBFBFB';
			orion.mainpanel = 'white';
			orion.toolpanel = 'white';
			orion.navtext = '#bfbfbf';
			orion.content = '#3087B3';
			orion.search = '#444';
			orion.breadcrumb = '#3087B3';
			orion.separator = '#333';
			orion.bannerProgress = "whitesmoke";

			this.styles.push( orion );		
			
			var orion2014 = new StyleSet();
			orion2014.name = messages['orion2014ThemeName'];
			orion2014.navbar = 'white';
			orion2014.button = '#EFEFEF';
			orion2014.location = '#EFEFEF';
			orion2014.selection = 'FEC';
			orion2014.sidepanel = '#EEEEEE';
			orion2014.mainpanel = '#EEEEEE';
			orion2014.toolpanel = '#EEEEEE';
			orion2014.navtext = '#BFBFBF';
			orion2014.content = '#333333';
			orion2014.search = '#444444';
			orion2014.breadcrumb = '#333333';
			orion2014.separator = '#333333';
			orion2014.bannerProgress = "orange";

			this.styles.push( orion2014 );		

			var eire = new StyleSet();
			
			eire.name = messages['greenZoneThemeName'];
			eire.navbar = 'seagreen';
			eire.button = 'lavender';
			eire.location = 'darkseagreen';
			eire.selection = 'moccasin';
			eire.sidepanel = 'aliceblue';
			eire.mainpanel = 'white';
			eire.toolpanel = 'white';
			eire.navtext = '#FBFBFB';
			eire.content = 'darkgreen';
			eire.search = 'darkgreen';
			eire.breadcrumb = '#3087B3';
			eire.separator = 'seagreen';
			eire.bannerProgress = "#F2F2F2";
			
			this.styles.push( eire );
			
			var avril = new StyleSet();
			
			avril.name = messages['prettyInPinkThemeName'];
			avril.navbar = 'plum';
			avril.button = 'lavender';
			avril.location = 'pink';
			avril.selection = 'lavender';
			avril.sidepanel = 'seashell';
			avril.mainpanel = 'white';
			avril.toolpanel = 'white';
			avril.navtext = '#FBFBFB';
			avril.content = 'mediumorchid';
			avril.search = 'violet';
			avril.breadcrumb = '#3087B3';
			avril.separator = 'plum';
			avril.bannerProgress = "#F2F2F2";
			
			this.styles.push( avril );
			
			var blue = new StyleSet();
			
			blue.name = messages['blueMondayThemeName'];
			blue.navbar = 'cornflowerblue';
			blue.button = 'lavender';
			blue.location = 'skyblue';
			blue.selection = 'lavender';
			blue.sidepanel = 'aliceblue';
			blue.mainpanel = 'white';
			blue.toolpanel = 'white';
			blue.navtext = '#FBFBFB';
			blue.content = 'royalblue';
			blue.search = 'royalblue';
			blue.breadcrumb = '#3087B3';
			blue.separator = 'cornflowerblue';
			blue.bannerProgress = "#F2F2F2";
			
			this.styles.push( blue );
			
			var vanilla = new StyleSet();
			
			vanilla.name = messages['vanillaSkiesThemeName'];
			vanilla.navbar = 'sandybrown';
			vanilla.button = 'lemmonchiffon';
			vanilla.location = 'cornsilk';
			vanilla.selection = 'lemonchiffon';
			vanilla.sidepanel = 'white';
			vanilla.mainpanel = 'white';
			vanilla.toolpanel = 'white';
			vanilla.navtext = 'lemonchiffon';
			vanilla.content = 'chocolate';
			vanilla.search = 'moccasin';
			vanilla.breadcrumb = '#3087B3';
			vanilla.separator = 'sandybrown';
			vanilla.bannerProgress = "#F2F2F2";
			
			this.styles.push( vanilla );
			
			var beetlejuice = new StyleSet();
			
			beetlejuice.name = messages['beetlejuiceThemeName'];
			beetlejuice.navbar = 'indigo';
			beetlejuice.button = 'slateblue';
			beetlejuice.location = 'darkslateblue';
			beetlejuice.selection = 'silver';
			beetlejuice.sidepanel = 'lavender';
			beetlejuice.mainpanel = 'white';
			beetlejuice.toolpanel = 'white';
			beetlejuice.navtext = '#FBFBFB';
			beetlejuice.content = 'mediumslateblue';
			beetlejuice.search = '#444';
			beetlejuice.breadcrumb = '#3087B3';
			beetlejuice.separator = 'indigo';
			beetlejuice.bannerProgress = "#F2F2F2";
			
			this.styles.push( beetlejuice );
			
			var red = new StyleSet();
			
			red.name = messages['redThemeName'];
			red.navbar = '#CD2127';
			red.button = '#777777';
			red.location = '#D85F56';
			red.selection = 'lightcoral';
			red.sidepanel = '#EFDAB2';
			red.mainpanel = '#FDFADD';
			red.toolpanel = '#FDFADD';
			red.navtext = '#FBFBFB';
			red.content = 'darkred';
			red.search = '#D85F56';
			red.breadcrumb = 'darkred';
			red.separator = '#CD2127';
			red.bannerProgress = "#F2F2F2";
			
			this.styles.push( red );		
		}
		
		function getStyles(){
			return this.styles;
		}
		
		ThemeData.prototype.styles = [];
		ThemeData.prototype.getStyles = getStyles;
		
		
		function getThemeStorageInfo(){
			return {
				storage:'/themes',
				styleset:'styles',
				defaultTheme:messages['orion2014ThemeName'],
				selectedKey: 'selected',
				version: THEMES_VERSION
			};
		}

		ThemeData.prototype.getThemeStorageInfo = getThemeStorageInfo;

		function getViewData(){
		
			var TOP = 10;
			var LEFT = 10;
			var UI_SIZE = 350;
			var BANNER_HEIGHT = 32;
			var NAV_HEIGHT = 29;
			var CONTENT_TOP = TOP + BANNER_HEIGHT + NAV_HEIGHT;
		
			var dataset = {};
			dataset.top = TOP;
			dataset.left = LEFT;
			dataset.width = UI_SIZE;
			dataset.height = UI_SIZE;
			
			dataset.shapes = [ 
								{ type:'RECTANGLE', 	name: messages["Navigation Bar"],		x:LEFT,		y:TOP,					width:UI_SIZE,	height: BANNER_HEIGHT, family:'navbar', fill: '#333', order:1 },
								{ type:'TEXT',		name: messages["Navigation Text"],	 label:'UserName',	x:LEFT + UI_SIZE - 70, y:TOP + 20, family:'navtext', fill: '#bfbfbf', font: '8pt sans-serif'},
								{ type:'ROUNDRECTANGLE', name: messages["Search Box"],	x:LEFT + UI_SIZE - 145,	y:TOP + 10, width: 70,	height: 12, family:'search', fill: '#444', order:3 },
								{ type:'RECTANGLE', name: messages["Tool Panel"],	x:LEFT + UI_SIZE * 0.4, y:CONTENT_TOP, width:UI_SIZE * 0.6 -1, height:30, family:'toolpanel', fill: 'white', order:4 },
								{ type:'RECTANGLE', name: messages["Selection Bar"],	x:LEFT + UI_SIZE * 0.4 + 5, y:CONTENT_TOP + 62, width:UI_SIZE * 0.6 -10, height:20, family:'selection', fill: '#FEC', order:7 },
							   	{ type:'RECTANGLE', 	name: messages["Location"],	x:LEFT,		y:TOP + BANNER_HEIGHT, 	width:UI_SIZE,	height: NAV_HEIGHT, family:'location', fill: '#efefef', order:8 },
								{ type:'TEXT',		name: messages["Navigation Text"],	 label:'Navigator',	x:LEFT + 50, y: TOP + 20, family:'navtext', fill: '#bfbfbf', font: '8pt sans-serif', order:2 },
							  	{ type:'TEXT',		name: messages["Content"],	 label:'Breadcrumb',	x:LEFT + 5, y:TOP + BANNER_HEIGHT + 18, family:'content', fill: '#3087B3', font: '8pt sans-serif' },
								{ type:'TEXT',		name: messages["Content"],	 label:'/',	x:LEFT + 68, y:TOP + BANNER_HEIGHT + 18, family:'content', fill: '#3087B3', font: '8pt sans-serif', order:9 },
								{ type:'TEXT',		name: messages["Content"],	 label:'Location',	x:LEFT + 74, y:TOP + BANNER_HEIGHT + 18, family:'content', fill: '#3087B3', font: '8pt sans-serif' },
								{ type:'RECTANGLE', name: messages["Main Panel"],	x:LEFT + UI_SIZE * 0.4, y:CONTENT_TOP + 30, width:UI_SIZE * 0.6 -1, height:UI_SIZE - CONTENT_TOP + TOP -31, family:'mainpanel', fill: 'white', order:6 },
								{ type:'ROUNDRECTANGLE', name: messages["Button"],	x:LEFT + UI_SIZE * 0.4 + 5, y:CONTENT_TOP + 5, width:37, height:20, family:'button', fill: '#EFEFEF', order:11 },
								{ type:'TEXT',		name: messages["Button Text"],	 label:'Button',	x:LEFT + UI_SIZE * 0.4 + 8, y:CONTENT_TOP + 19, family:'navbar', fill: '#333', font: '8pt sans-serif' },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + UI_SIZE - 7, y1:TOP + 14, x2:LEFT + UI_SIZE - 13, y2:TOP + 14, x3:LEFT + UI_SIZE - 10, y3:TOP + 19, family:'userMenu', fill: '#BFBFBF' },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + 10, y1:CONTENT_TOP + 17, x2:LEFT + 16, y2:CONTENT_TOP + 17, x3:LEFT + 13, y3:CONTENT_TOP + 22, family:'userMenu', fill: '#BFBFBF' },
								{ type:'TEXT',		name: messages["Section Text"],	 label:'Section',	x:LEFT + 20, y:CONTENT_TOP + 23, family:'navbar', fill: '#333', font: '8pt sans-serif' },
								{ type:'LINE', 		name: messages["Line Color"], x1:LEFT + UI_SIZE * 0.4, y1:CONTENT_TOP + 30, x2:LEFT + UI_SIZE, y2:CONTENT_TOP + 30, linewidth:2, fill:'#DEDEDE' },
								{ type:'LINE', 		name: messages["Line Color"], x1:LEFT + UI_SIZE * 0.4, y1:CONTENT_TOP, x2:LEFT + UI_SIZE * 0.4, y2:TOP + UI_SIZE, linewidth:2, fill:'#DEDEDE'},
								{ type:'LINE', 		name: messages["Line Color"], x1:LEFT + 10, y1:CONTENT_TOP + 29, x2:LEFT + UI_SIZE * 0.4 - 10, y2:CONTENT_TOP + 29, linewidth:2, fill:'#DEDEDE' },
								{ type:'RECTANGLE', 	name: messages["Side Panel"],	x:LEFT,		y:CONTENT_TOP, 			width: UI_SIZE * 0.4,	height: UI_SIZE - CONTENT_TOP + TOP, family:'sidepanel', fill: '#FBFBFB', order:12 },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + UI_SIZE - 7, y1:TOP + 14, x2:LEFT + UI_SIZE - 13, y2:TOP + 14, x3:LEFT + UI_SIZE - 10, y3:TOP + 19, family:'userMenu', fill: '#BFBFBF' },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + 10, y1:CONTENT_TOP + 17, x2:LEFT + 16, y2:CONTENT_TOP + 17, x3:LEFT + 13, y3:CONTENT_TOP + 22, family:'userMenu', fill: '#BFBFBF' },
								{ type:'TEXT',		name: messages["Navigation Text"],	 label:'Navigator',	x:LEFT + 50, y: TOP + 20, family:'navtext', fill: '#bfbfbf', font: '8pt sans-serif', order:2 },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + UI_SIZE - 7, y1:TOP + 14, x2:LEFT + UI_SIZE - 13, y2:TOP + 14, x3:LEFT + UI_SIZE - 10, y3:TOP + 19, family:'userMenu', fill: '#BFBFBF' },
								{ type:'TRIANGLE',	name:'userMenu', x1:LEFT + 10, y1:CONTENT_TOP + 17, x2:LEFT + 16, y2:CONTENT_TOP + 17, x3:LEFT + 13, y3:CONTENT_TOP + 22, family:'userMenu', fill: '#BFBFBF' }
			];
			
			
			for( var count=0; count < 3; count++ ){
					
				/* Section Items */
					
				dataset.shapes.push( { type:'TEXT', name: messages["Content"], label:'org.eclipse.orion.content', x: LEFT + UI_SIZE * 0.4 + 20, y:CONTENT_TOP + 56 + ( 20 * count ), fill: '#3087B3', family:'content' } );
			}
			
			for( var count=0; count < 3; count++ ){
					
				/* Section Items */
					
				dataset.shapes.push( { type:'TEXT', name: messages["Content"], label:'Item', x:LEFT + 15, y:CONTENT_TOP + 44 + ( 20 * count ), fill: '#3087B3', family:'content' } );
			}
			
			for( var twisty = 0; twisty < 3; twisty++ ){
			
				dataset.shapes.push( { type:'TRIANGLE',	name:'twisty', 
				x1: LEFT + UI_SIZE * 0.4 + 10, y1:CONTENT_TOP + 50 + (twisty*20), 
				x2:LEFT + UI_SIZE * 0.4 + 15, y2: CONTENT_TOP + 53 + (twisty*20), 
				x3:LEFT + UI_SIZE * 0.4 + 10, y3: CONTENT_TOP + 56 + (twisty*20), 
				family:'navbar', fill: '#333' } );
			}
			
			dataset.shapes.push( { type:'IMAGE', 		name:'logo', x: LEFT + 5, y:TOP + 8, source: '../../images/orion-transparent.png', family:'logo' } );
			
			return dataset;
		}

		ThemeData.prototype.getViewData = getViewData;
		
		function processSettings( settings ){
			var sheetMaker = new ThemeSheetWriter.ThemeSheetWriter();
			var themeClass = "orionTheme";
			var theme = new mTextTheme.TextTheme.getTheme(themeClass);
			theme.setThemeClass(themeClass, sheetMaker.getSheet( settings ));
		}
		
		ThemeData.prototype.processSettings = processSettings;

		return{
			ThemeData:ThemeData,
			getStyles:getStyles
		};
	}
);