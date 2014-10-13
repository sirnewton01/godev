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
		'orion/widgets/themes/ThemeVersion'
], function(messages, mTextTheme, THEMES_VERSION) {

	// *******************************************************************************
	//
	// If you change any styles in this file, you must increment the version number
	// in ThemeVersion.js.
	//
	// *******************************************************************************

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
		
		var defaultFont = '"Consolas", "Monaco", "Vera Mono", monospace';
		var defaultFontSize = '12px';

		function ThemeData() {

		this.styles = [];

		var eclipse = {
			name: messages["eclipseThemeName"],
			className: "eclipse", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "white", //$NON-NLS-0$
				color: "darkSlateGray", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #DDDDDD", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #DDDDDD" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "white" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#444", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#EAF2FE" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "green", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "darkorange" //$NON-NLS-0$
					}
				},
				string: {
					color: "blue" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "#7F0055" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};		
		this.styles.push(eclipse);

		var prospecto = {
			name: messages["prospectoThemeName"],
			className: "prospecto", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "white", //$NON-NLS-0$
				color: "#333", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #EEEEEE", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #EEEEEE" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "white" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#CCCCCC", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#EAF2FE" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "#3C802C", //$NON-NLS-0$
				},
				constant: {
					color: "darkOrchid" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "#CC4C07", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "#9F4177", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "#CC4C07" //$NON-NLS-0$
					}
				},
				string: {
					color: "#446FBD" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "#9F4177" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(prospecto);

		var darker = {
			name: messages["darkerThemeName"],
			className: "darker", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "#272822", //$NON-NLS-0$
				color: "#F8F8F2", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,
				
				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #272822", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #272822" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "#272822" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#999999", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#32322A" //$NON-NLS-0$
					}
				},
				annotationRange: {
					writeOccurrence: {
						backgroundColor: "steelblue" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "#75715E", //$NON-NLS-0$
				},
				constant: {
					color: "#C48CFF" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "#CFBFAD" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "orangered", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "#52E3F6", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "skyblue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "greenyellow" //$NON-NLS-0$
					}
				},
				string: {
					color: "#F0E383" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "#52E3F6" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};		
		this.styles.push(darker);

		var blue = {
			name: messages["blueThemeName"],
			className: "blue", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "aliceBlue", //$NON-NLS-0$
				color: "navy", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid white", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid white" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "lavender" //$NON-NLS-0$
				},
				rulerLines: {
					color: "darkSlateGray", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "white" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "indigo", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "cornFlowerBlue", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "cornFlowerBlue", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "cornFlowerBlue" //$NON-NLS-0$
					}
				},
				string: {
					color: "cornFlowerBlue" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "cornFlowerBlue" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(blue);

		var ambience = {
			name: messages["ambienceThemeName"],
			className: "ambience", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "darkgrey", //$NON-NLS-0$
				color: "darkseagreen", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #BAA289", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #BAA289" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "#3D3D3D", //$NON-NLS-0$
					overview: {
						backgroundColor: "white" //$NON-NLS-0$
					}
				},
				rulerLines: {
					color: "black", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "lightcyan" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "mediumslateblue", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "cornFlowerBlue", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "cornFlowerBlue", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "cornFlowerBlue" //$NON-NLS-0$
					}
				},
				string: {
					color: "lightcoral" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "cornFlowerBlue" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(ambience);

		var tierra = {
			name: messages["tierraThemeName"],
			className: "tierra", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "lemonchiffon", //$NON-NLS-0$
				color: "#555555", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #BAA289", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #BAA289" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "moccasin" //$NON-NLS-0$
				},
				rulerLines: {
					color: "chocolate", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#BAA289" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "darkseagreen", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "darkred", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "darkred", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "darkred" //$NON-NLS-0$
					}
				},
				string: {
					color: "orangered" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "darkred" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(tierra);


		var nimbus = {
			name: messages["nimbusThemeName"],
			className: "nimbus", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "#333333", //$NON-NLS-0$
				color: "#DDDDDD", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #3A3A3A", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #3A3A3A" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "#232323" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#555555", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "dimgrey" //$NON-NLS-0$
					}
				},
				annotationRange: {
					writeOccurrence: {
						backgroundColor: "steelblue" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "darkseagreen", //$NON-NLS-0$
				},
				constant: {
					color: "#01B199" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "darkorange", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "darkorange", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "darkorange" //$NON-NLS-0$
					}
				},
				string: {
					color: "cornflowerblue" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "darkorange" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(nimbus);

		var adelante = {
			name: messages["adelanteThemeName"],
			className: "adelante", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "#F1E7C8", //$NON-NLS-0$
				color: "dimgray", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #9E937B", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #9E937B" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "#E2D2B2" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#AF473B", //$NON-NLS-0$
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#9E937B" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "#5D774E", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "#AF473B", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "#AF473B", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "#AF473B" //$NON-NLS-0$
					}
				},
				string: {
					color: "#DE5D3B" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "#AF473B" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
		this.styles.push(adelante);

		var raspberry = {
			name: messages["raspberryPiThemeName"],
			className: "raspberry", //$NON-NLS-0$
			styles: {
				/* top-level properties */
				backgroundColor: "seashell", //$NON-NLS-0$
				color: "dimgray", //$NON-NLS-0$
				fontFamily: defaultFont,
				fontSize: defaultFontSize,

				/* from textview.css */
				textviewRightRuler: {
					borderLeft: "1px solid #FBDFDE", //$NON-NLS-0$
				},
				textviewLeftRuler: {
					borderRight: "1px solid #FBDFDE" //$NON-NLS-0$
				},

				/* from rulers.css */
				ruler: {
					backgroundColor: "seashell" //$NON-NLS-0$
				},
				rulerLines: {
					color: "#E73E36", //$NON-NLS-0$
					even: {
						color: "#F6B8B6", //$NON-NLS-0$
					},
					odd: {
						color: "#F6B8B6", //$NON-NLS-0$
					}
				},

				/* from annotations.css */
				annotationLine: {
					currentLine: {
						backgroundColor: "#F5B1AE" //$NON-NLS-0$
					}
				},

				/* from textstyler.css */
				comment: {
					color: "#66B32F", //$NON-NLS-0$
				},
				constant: {
					color: "blue" //$NON-NLS-0$
				},
				entity: {
					name: {
						color: "#98937B", //$NON-NLS-0$
						"function": { //$NON-NLS-0$
							fontWeight: "bold", //$NON-NLS-0$
							color: "#67BBB8" //$NON-NLS-0$
						}
					},
					other: {
						"attribute-name": { //$NON-NLS-0$
							color: "cadetBlue" //$NON-NLS-0$
						}
					}
				},
				keyword: {
					control: {
						color: "#E73E36", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					operator: {
						color: "#E73E36", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						documentation: {
							color: "#7F9FBF" //$NON-NLS-0$
						}
					}
				},
				markup: {
					bold: {
						fontWeight: "bold" //$NON-NLS-0$
					},
					heading: {
						color: "blue" //$NON-NLS-0$
					},
					italic: {
						fontStyle: "italic" //$NON-NLS-0$
					},
					list: {
						color: "#CC4C07" //$NON-NLS-0$
					},
					other: {
						separator: {
							color: "#00008F" //$NON-NLS-0$
						},
						strikethrough: {
							textDecoration: "line-through" //$NON-NLS-0$
						},
						table: {
							color: "#3C802C" //$NON-NLS-0$
						}
					},
					quote: {
						color: "#446FBD" //$NON-NLS-0$
					},
					raw: {
						fontFamily: "monospace" //$NON-NLS-0$
					},
					underline: {
						link: {
							textDecoration: "underline" //$NON-NLS-0$
						}
					}
				},
				meta: {
					documentation: {
						annotation: {
							color: "#7F9FBF" //$NON-NLS-0$
						},
						tag: {
							color: "#7F7F9F" //$NON-NLS-0$
						}
					},
					tag: {
						color: "#E73E36" //$NON-NLS-0$
					}
				},
				string: {
					color: "darkorange" //$NON-NLS-0$
				},
				support: {
					type: {
						propertyName: {
							color: "#E73E36" //$NON-NLS-0$
						}
					}
				},
				variable: {
					language: {
						color: "#7F0055", //$NON-NLS-0$
						fontWeight: "bold" //$NON-NLS-0$
					},
					other: {
						color: "#E038AD" //$NON-NLS-0$
					},
					parameter: {
						color: "#D1416F" //$NON-NLS-0$
					}
				}
			}
		};
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
			return {
				storage:'/themes',
				styleset:'editorstyles',
				defaultTheme:'Prospecto',
				selectedKey: 'editorSelected',
				version: THEMES_VERSION
			}; 
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
			type: 'RECTANGLE',
			name: messages.Background,
			x: LEFT + 46,
			y: TOP,
			width: 290,
			height: dataset.height,
			family: 'backgroundColor',
			fill: 'white'
		},
		{
			type: 'TEXT',
			name: messages.SingleQuotedStrings,
			label: "'text/javascript'",
			x: LEFT + 134,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'string.quoted.single',
			font: '9pt sans-serif'
		},
		
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '=',
			x: LEFT + 124,
			y: TOP + 20,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},

		
		{
			type: 'RECTANGLE',
			name: messages["Current Line"],
			x: LEFT + 46,
			y: TOP + 87,
			width: 290,
			height: 18,
			family: 'annotationLine.currentLine',
			fill: '#eaf2fd'
		},
		
		{
			type: 'TEXT',
			name: messages["Attribute Names"],
			label: 'type',
			x: LEFT + 98,
			y: TOP + 20,
			fill: 'darkGray',
			family: 'entity.other.attribute-name',
			font: '9pt sans-serif'
		},
		
		{
			type: 'RECTANGLE',
			name: messages["Overview Ruler"],
			x: LEFT + 336,
			y: TOP,
			width: 14,
			height: dataset.height,
			family: 'ruler.overview',
			fill: 'white'
		},	
		{
			type: 'TEXT',
			name: messages.BlockComments,
			label: '/* comment */',
			x: LEFT + 75,
			y: TOP + 40,
			fill: 'darkSeaGreen',
			family: 'comment.block',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '<script',
			x: LEFT + 55,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'meta.tag',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '>',
			x: LEFT + 213,
			y: TOP + 20,
			fill: 'darkorange',
			family: 'meta.tag',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.DoubleQuotedStrings,
			label: '"Result"',
			x: LEFT + 164,
			y: TOP + 80,
			fill: 'cornflowerBlue',
			family: 'string.quoted.double',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.LineComments,
			label: '// $NON-NLS-0$',
			x: LEFT + 224,
			y: TOP + 80,
			fill: 'cornflowerBlue',
			family: 'comment.line',
			font: '9pt sans-serif'
		},
		
		
		{
			type: 'TEXT',
			name: messages.FunctionNames,
			label: 'area',
			x: LEFT + 120,
			y: TOP + 60,
			fill: 'darkSlateGray',
			family: 'entity.name.function',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '(',
			x: LEFT + 148,
			y: TOP + 60,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Parameters,
			label: 'rad',
			x: LEFT + 152,
			y: TOP + 60,
			fill: 'darkSlateGray',
			family: 'variable.parameter',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ') {',
			x: LEFT + 170,
			y: TOP + 60,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},

		{
			type: 'TEXT',
			name: messages.OperatorKeywords,
			label: 'function',
			x: LEFT + 75,
			y: TOP + 60,
			fill: 'darkorange',
			family: 'keyword.operator',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.OperatorKeywords,
			label: 'var',
			x: LEFT + 95,
			y: TOP + 80,
			fill: 'darkorange',
			family: 'keyword.operator',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'output = ',
			x: LEFT + 115,
			y: TOP + 80,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ';',
			x: LEFT + 205,
			y: TOP + 80,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.OperatorKeywords,
			label: 'var',
			x: LEFT + 95,
			y: TOP + 100,
			fill: 'darkorange',
			family: 'keyword.operator',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'result = Math.pi * Math.pow(rad,',
			x: LEFT + 115,
			y: TOP + 100,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["DecimalNumbers"],
			label: '2',
			x: LEFT + 288,
			y: TOP + 100,
			fill: 'darkSlateGray',
			family: 'constant.numeric',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ');',
			x: LEFT + 295,
			y: TOP + 100,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.ControlKeywords,
			label: 'return',
			x: LEFT + 95,
			y: TOP + 120,
			fill: 'darkorange',
			family: 'keyword.control',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: 'output + result;',
			x: LEFT + 132,
			y: TOP + 120,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '}',
			x: LEFT + 75,
			y: TOP + 140,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '</script>',
			x: LEFT + 55,
			y: TOP + 160,
			fill: 'darkorange',
			family: 'meta.tag',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '<style',
			x: LEFT + 55,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'meta.tag',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Attribute Names"],
			label: 'type',
			x: LEFT + 93,
			y: TOP + 200,
			fill: 'darkGray',
			family: 'entity.other.attribute-name',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '=',
			x: LEFT + 119,
			y: TOP + 200,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.SingleQuotedStrings,
			label: "'text/css'",
			x: LEFT + 129,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'string.quoted.single',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '>',
			x: LEFT + 178,
			y: TOP + 200,
			fill: 'darkorange',
			family: 'meta.tag',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '.some-class {',
			x: LEFT + 75,
			y: TOP + 220,
			fill: 'darkorange',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Property Names"],
			label: 'color',
			x: LEFT + 95,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'support.type.propertyName',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ':',
			x: LEFT + 122,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.HexNumber,
			label: '#123456',
			x: LEFT + 130,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'constant.numeric.hex',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: ';',
			x: LEFT + 180,
			y: TOP + 240,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages.Foreground,
			label: '}',
			x: LEFT + 75,
			y: TOP + 260,
			fill: 'darkSlateGray',
			family: 'color',
			font: '9pt sans-serif'
		},
		{
			type: 'TEXT',
			name: messages["Tags"],
			label: '</style>',
			x: LEFT + 55,
			y: TOP + 280,
			fill: 'darkorange',
			family: 'meta.tag',
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
			family: 'ruler.annotations',
			fill: 'white'
		}];

		for (var line = 0; line < 16; line++) {
			var isOdd = (line + 1) % 2 === 1;
			dataset.shapes.push({
				type: 'TEXT',
				name: isOdd ? messages["Odd Line Numbers"] : messages["Even Line Numbers"],
				label: line + 1,
				x: LEFT + 20,
				y: TOP + (20 * line) + 20,
				fill: 'darkSlateGray',
				family: isOdd ? 'rulerLines.odd' : 'rulerLines.even',
				font: '9pt sans-serif'
			});
		}

		return dataset;
	}
		
		function parseToXML(text) {
			try {
				var parser = new DOMParser();
				var xml = parser.parseFromString(text, "text/xml"); //$NON-NLS-0$
				var found = xml.getElementsByTagName("parsererror"); //$NON-NLS-0$
				if (!found || !found.length || !found[0].childNodes.length) {
					return xml;
				}
			} catch (e) { /* suppress */ }
			return null;
		}

		ThemeData.prototype.parseToXML = parseToXML;
		
		function selectFontSize(size) {
			window.console.log("fontsize: " + size ); //$NON-NLS-0$
		}
		
		ThemeData.prototype.selectFontSize = selectFontSize;
		
		function importTheme(data) {
			var body = data.parameters.valueFor("name"); //$NON-NLS-0$
			var xml = this.parseToXML(body);
			if (xml) {
				/* old-style theme definition */
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
			} else {
				/* parsing the data as xml failed, now try the new-style theme definition (JSON) */
				try {
					newStyle = JSON.parse(body);
				} catch (e) {}
			}

			if (newStyle) {
				data.items.addTheme(newStyle);
			} else {
				// TODO no
			}
		}
		
		ThemeData.prototype.importTheme = importTheme;
		
		function processSettings(settings, preferences) {
			var themeClass = "editorTheme"; //$NON-NLS-0$
			var theme = mTextTheme.TextTheme.getTheme();
			theme.setThemeClass(themeClass, theme.buildStyleSheet(themeClass, settings));
		}

		ThemeData.prototype.processSettings = processSettings;

		ThemeData.prototype.getViewData = getViewData;

		return {
			ThemeData:ThemeData,
			getStyles:getStyles
		};
	}
);
