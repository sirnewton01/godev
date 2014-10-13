/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define(['i18n!orion/settings/nls/messages', 'orion/commands', 'orion/commandRegistry', 'orion/webui/littlelib',
    'orion/widgets/themes/ThemeComponent', 'orion/widgets/input/Select', 'orion/widgets/input/TextField',
    'orion/i18nUtil'],

function(messages, mCommands, mCommandRegistry, lib, Component, Select, TextField, i18nUtil) {

    var TOP = 10;
    var LEFT = 10;
    var UI_SIZE = 350;

    var SELECTED_ZONE = null;
    var INITIALIZE = true;
    var OUTLINEDATA = false;
    var ARCS = true;

    var zones = [];
    var canvas = null;
    var ctx = null;

    var over = null;

    var colorFieldId;

    function init() {
        SELECTED_ZONE = null;
        INITIALIZE = true;
        ARCS = true;
        zones = [];
        canvas = null;
        ctx = null;
        over = null;
    }

    function Family(familyName, familyValue) {
        this.name = familyName;
        this.value = familyValue;
    }

    var familyName;
    var familyValue;

    Family.prototype.name = familyName;
    Family.prototype.value = familyValue;

    function ThemeBuilder(args) {
        this.settings = {};
        this.themeData = args.themeData;
        this.toolbarId = args.toolbarId;
        this.serviceRegistry = args.serviceRegistry;
        this.messageService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$

        init();

        var commandTemplate = '<div id="commandButtons">' +
            '<div id="userCommands" class="layoutRight sectionActions"></div>' +
            '</div>';

        var commandArea = document.getElementById('pageActions');
        commandArea.innerHTML = commandTemplate;

        this.commandService = args.commandService;
        this.preferences = args.preferences;

        var exportCommand = new mCommands.Command({
            name: messages.Export,
            tooltip: messages['Export a theme'],
            id: "orion.exportTheme", //$NON-NLS-0$
            callback: exportTheme
        });

        this.commandService.addCommand(exportCommand);
        this.commandService.registerCommandContribution('themeCommands', "orion.exportTheme", 5); //$NON-NLS-1$ //$NON-NLS-0$
    }

    function applyColor() {
        var newColor = document.getElementById(this.colorFieldId).firstChild.value;
        newColor = this.validateHex(newColor);
        if (newColor) {
            zones[SELECTED_ZONE.id].fill = newColor;
            this.updateFamily(zones[SELECTED_ZONE.id].family, newColor);
            this.refresh();
            zones[SELECTED_ZONE.id].glow(UI_SIZE, TOP);
            this.drawPicker(ctx, zones[SELECTED_ZONE.id]);
			this.revealSaveContainer();
        }
    }
    ThemeBuilder.prototype.applyColor = applyColor;

    ThemeBuilder.prototype.colorFieldId = colorFieldId;

    var AUTONAME = false;

    ThemeBuilder.prototype.AUTONAME = AUTONAME;

    ThemeBuilder.prototype.template = '<div id="themeContainer">' +
        '<canvas id="orionui" width="800" height="380""></canvas>' +
        '<div id="helpcaption" class="settingsLabel caption">' + messages["clickDiagram"] +
        '</div>' +
        '<div id="pickercontainer" style="display:block;">' +
        '<span class="settingsLabel">' + messages["Theme:"] +
        '</span>' +
        '<div id="themepicker" class="themepicker"></div>' +
        '</div>' +
        '<div id="savecontainer" style="display:none;">' +
        '<span class="settingsLabel">' + messages["New Theme Name:"] +
        '</span>' +
        '<div id="themesaver" class="themesaver"></div>' +
        '<button id="saveButton" class="orionButton commandButton commandMargins">' + messages["buttonSave"] + "</button>" +
        '<button id="revertButton" class="orionButton commandButton commandMargins">' + messages["buttonRevert"] + "</button>" +
        '</div>' +
        '<div id="sizecontainer">' +
        '<span class="settingsLabel">' + messages["Font Size:"] +
        '</span>' +
        '<div id="fontsizepicker" class="fontsizepicker"></div>' +
        '</div>' +
        '<div id="stringcontainer" style="position:relative;left:400px;top:-140px;display:none;">' +
        '<span>' + messages["OR HEX:"] +
        '</span>' +
        '<div id="colorstring" class="colorfield"></div>' +
        '<button class="orionButton commandButton commandMargins" type="button" id="colorButton">' + messages["Ok"] +
        '</button>' +
        '</div>' +
        '</div>';

    var colornames = [
        ["white", "seashell", "cornsilk", "lemonchiffon", "lightyellow", "palegreen", "paleturquoise", "aliceblue", "lavender", "plum"],
        ["lightgray", "pink", "bisque", "moccasin", "khaki", "lightgreen", "lightseagreen", "lightcyan", "cornflowerblue", "violet"],
        ["silver", "lightcoral", "sandybrown", "orange", "palegoldenrod", "chartreuse", "mediumturquoise", "skyblue", "mediumslateblue", "orchid"],
        ["gray", "red", "orangered", "darkorange", "yellow", "limegreen", "darkseagreen", "royalblue", "slateblue", "mediumorchid"],
        ["dimgray", "crimson", "chocolate", "coral", "gold", "forestgreen", "seagreen", "blue", "blueviolet", "darkorchid"],
        ["darkslategray", "firebrick", "saddlebrown", "sienna", "olive", "green", "darkcyan", "mediumblue", "darkslateblue", "darkmagenta"],
        ["black", "darkred", "maroon", "brown", "darkolivegreen", "darkgreen", "midnightblue", "navy", "indigo", "purple"]
    ];

    ThemeBuilder.prototype.colornames = colornames;

    function addAdditionalCommand(commandData) {
        var commitMessageParameters = new mCommandRegistry.ParametersDescription(
        [new mCommandRegistry.CommandParameter('name', 'text', messages['Commit message:'], "", 4)], //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-0$
        {
            hasOptionalParameters: false
        });

        var command = new mCommands.Command({
            name: commandData.name,
            tooltip: commandData.tip,
            parameters: commitMessageParameters,
            id: commandData.id, //$NON-NLS-0$
            callback: function(data) {
                commandData.callback(data);
            }.bind(this)
        });

        this.commandService.addCommand(command);
        this.commandService.registerCommandContribution('themeCommands', commandData.id, 4); //$NON-NLS-1$ //$NON-NLS-0$
    }
    ThemeBuilder.prototype.addAdditionalCommand = addAdditionalCommand;

    function validateHex(hexcode) {
        var regColorcode = /^#?([0-9a-fA-F]{3})([0-9a-fA-F]{3})?$/;
        if (!regColorcode.test(hexcode)) {
        	return null;
        }
        return hexcode.indexOf("#") ? "#" + hexcode : hexcode;
    }
    ThemeBuilder.prototype.validateHex = validateHex;

    /* MOUSE EVENTS */

    function clear() {
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.width;
            canvas.height = canvas.height;
        }
        var stringContainer = lib.node('stringcontainer');
        stringContainer.style.display = 'none';
    }

    ThemeBuilder.prototype.clear = clear;

    function refresh() {
        this.clear();

        if (OUTLINEDATA) {
            this.drawOutlineData();
        }

        this.sizeSelect.setSelection(this.settings.fontSize ? this.settings.fontSize.value : this.rootTheme.styles.fontSize);
    }
    ThemeBuilder.prototype.refresh = refresh;

    function getCoordinates(e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function mouseMove(e) {
        var coordinates = getCoordinates(e);
        var x = coordinates.x;
        var y = coordinates.y;
        over = [];

        for (var z = 0; z < zones.length; z++) {
            if (zones[z].mouseOver(x, y)) {
                canvas.style.cursor = 'crosshair';
                zones[z].id = z;
                over.push(zones[z]);
                break;
            } else {
                canvas.style.cursor = '';
            }
        }
    }

    function mouseUp(/*e*/) {
        canvas.style.cursor = "";
    }

    function updateFamily(family, fill) {
        zones.forEach(function(zone) {
            if (zone.family === family) {
                zone.fill = fill;
            }
        });

        for (var s in this.settings) {
            if (this.settings[s].name === family) {
                this.settings[s].value = fill;
                break;
            }
        }
    }
    ThemeBuilder.prototype.updateFamily = updateFamily;

    function drawPicker(ctx, component) {
        var x = UI_SIZE + 40;

        Component.drawText(ctx, component.description, LEFT + x, TOP + 10, 'bold 9pt sans-serif', '#555');
        Component.drawText(ctx, messages["COLOR:"], LEFT + x, TOP + 50, '8pt sans-serif', '#555');
        Component.drawRectangle(ctx, LEFT + x + 5, TOP + 60, 40, 15, component.fill, null);
        Component.drawText(ctx, component.fill, LEFT + x + 5 + 40 + 5, TOP + 70, '8pt sans-serif', '#555');
        Component.drawLine(ctx, LEFT + x, TOP + 25, LEFT + x + 190, TOP + 25, 10, '#555');
        Component.drawLine(ctx, LEFT + x, TOP + 85, LEFT + x + 190, TOP + 85, 5, '#555');
        Component.drawText(ctx, messages["NEW COLOR:"], LEFT + x, TOP + 115, 'bold 8pt sans-serif', '#555');

        if (ARCS) {
            for (var row = 0; row < 7; row++) {
                for (var column = 1; column < 11; column++) {
                    var item = column - 1;
                    var arc = Component.drawArc(ctx, LEFT + UI_SIZE + (column * 20) + 25, TOP + 90 + (row * 20) + 50, 7, 0, 2 * Math.PI, false, null, colornames[row][item]);
                    arc.paintchip = true;
                    zones.push(arc);
                }
            }

            ARCS = false;
        } else {
            for (var z = 0; z < zones.length; z++) {
                if (zones[z].paintchip) {
                    zones[z].render();
                }
            }
        }

        var stringContainer = document.getElementById('stringcontainer');
        stringContainer.style.display = '';
        stringContainer.zIndex = 1;

        var colorstring = document.getElementById(this.colorFieldId);

        if (!this.colfld) {
            this.colfld = new TextField({}, colorstring);
            this.colfld.show();
            this.colfld.width('100px');
        }
        var colorButton = document.getElementById('colorButton');
        colorButton.themebuilder = this;
        colorButton.onclick = this.applyColor.bind(this);
    }
    ThemeBuilder.prototype.drawPicker = drawPicker;

    var colfld;
    ThemeBuilder.prototype.colfld = colfld;

    function mouseDown(e) {
        var coordinates = getCoordinates(e);
        var x = coordinates.x;
        var y = coordinates.y;

        for (var z = 0; z < zones.length; z++) {
            if (zones[z].mouseOver(x, y)) {
                zones[z].id = z;
                over = [];
                this.refresh();
                over.push(zones[z]);
            }
        }

        if (over.length > 0) {
            var smallest = 0;
            for (var count = 0; count < over.length; count++) {
                if (over[count].width < over[smallest].width) {
                    smallest = count;
                }
            }

            switch (over[smallest].type) {
                case 'ELLIPSE':
                    zones[SELECTED_ZONE.id].fill = over[smallest].fill;
                    this.updateFamily(zones[SELECTED_ZONE.id].family, over[smallest].fill);
                    this.refresh();
                    zones[SELECTED_ZONE.id].glow(UI_SIZE, TOP);
                    this.drawPicker(ctx, zones[SELECTED_ZONE.id]);
                    this.revealSaveContainer();
                    if (this.AUTONAME === false) {
                        var currentTheme = this.themeSelect.getSelected();
                        this.themeSaver.setValue(currentTheme);
                        this.AUTONAME = true;
                    }
                    break;
                case 'RECTANGLE':
                case 'ROUNDRECTANGLE':
                case 'TEXT':
                    over[smallest].glow(UI_SIZE, TOP);
                    this.drawPicker(ctx, over[smallest]);
                    SELECTED_ZONE = over[smallest];
                    break;

                default:
                    break;

            }
        }
    }
    ThemeBuilder.prototype.mouseDown = mouseDown;

    function familyShown(families, family) {
        var shown = false;
        if (family) {
            for (var f in families) {
                if (families[f] === family) {
                    shown = true;
                    break;
                }
            }
        }
        return shown;
    }
    ThemeBuilder.prototype.familyShown = familyShown;

    function getCurrentSettings() {
        return this.settings;
    }
    ThemeBuilder.prototype.getCurrentSettings = getCurrentSettings;

    function addData(data) {
        this.settings = {};
        var defaultValue;
        OUTLINEDATA = true;

        if (data) {
            this.dataset = data;
            for (var shapecount = 0; shapecount < data.shapes.length; shapecount++) {
                if (data.shapes[shapecount].fill) {
                    defaultValue = data.shapes[shapecount].fill;
                } else {
                    defaultValue = data.shapes[shapecount].line;
                }
                this.settings[data.shapes[shapecount].family] = new Family(data.shapes[shapecount].family, defaultValue);
            }
        }
    }
    ThemeBuilder.prototype.addData = addData;

    function drawShape(shapedata, fillcolor) {
        var shape;
        switch (shapedata.type) {
            case 'RECTANGLE':
                shape = Component.drawRectangle(ctx, shapedata.x, shapedata.y, shapedata.width, shapedata.height, fillcolor, '#CCC');
                break;
            case 'TEXT':
                shape = Component.drawText(ctx, shapedata.label, shapedata.x, shapedata.y, shapedata.font, fillcolor);
                break;
            case 'ROUNDRECTANGLE':
                shape = Component.roundRect(ctx, shapedata.x, shapedata.y, shapedata.width, shapedata.height, 5, fillcolor, '#CCC');
                break;
            case 'LINE':
                Component.drawLine(ctx, shapedata.x1, shapedata.y1, shapedata.x2, shapedata.y2, shapedata.linewidth, fillcolor);
                break;
            case 'TRIANGLE':
                Component.drawTriangle(ctx, shapedata.x1, shapedata.y1, shapedata.x2, shapedata.y2, shapedata.x3, shapedata.y3, fillcolor);
                break;
            case 'IMAGE':
                var img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, shapedata.x, shapedata.y);
                };
                img.src = shapedata.source;
        }

        if (shape) {
            shape.description = shapedata.name;
            shape.family = shapedata.family;
            shape.paintchip = false;
            zones.push(shape);
        }
    }
    ThemeBuilder.prototype.drawShape = drawShape;

    function drawOutlineData(data) {
        if (data) {
            this.addData(data);
        }

        if (!canvas) {
            canvas = document.getElementById('orionui');
            ctx = canvas.getContext('2d');
            canvas.addEventListener("mousedown", this.mouseDown.bind(this), false);
            canvas.addEventListener("mousemove", mouseMove, false);
            canvas.addEventListener("mouseup", mouseUp, false);
        }

        if (INITIALIZE) {
            for (var item in this.dataset.shapes) {
                if (this.settings && this.settings[this.dataset.shapes[item].family]) {
                    var color = this.settings[this.dataset.shapes[item].family].value;
                    if (this.dataset.shapes[item].fill) {
                        this.dataset.shapes[item].fill = color;
                    } else {
                        this.dataset.shapes[item].line = color;
                    }
                }
                this.drawShape(this.dataset.shapes[item], this.dataset.shapes[item].fill, this.dataset.shapes[item].line, this.dataset.shapes[item].font);
            }
            INITIALIZE = false;
        } else {
            for (var z in zones) {
                if (!zones[z].paintchip) {
                    zones[z].render();
                }
            }
        }
    }
    ThemeBuilder.prototype.drawOutlineData = drawOutlineData;

	var successMessage = i18nUtil.formatMessage(messages["SettingUpdateSuccess"], messages["Theme"]); //$NON-NLS-1$ //$NON-NLS-0$

    function apply() {
        /* New Theme defined */
        this.preferences.getTheme(function(themeStyles) {
            var themeName = this.settings.name;
            var styles = themeStyles.styles;
            var themesaver = lib.node('themesaver');
            var name = themesaver.firstChild.value;

            if (name.length > 0) {
                var existingTheme = false;
                if (styles) {
                    for (var s = 0; s < styles.length; s++) {
                        if (styles[s].name === name) {
                            existingTheme = true;
                            break;
                        }
                    }
                }

                if (!existingTheme) {
                    var newtheme = {};
                    newtheme.name = name;
                    for (var setting in this.settings) {
                        var element = this.settings[setting].name;
                        if (element !== 'name') {
                            newtheme[element] = this.settings[setting].value;
                        }
                    }
                    styles.push(newtheme);
                }

                themeName = name;
                themesaver.firstChild.value = '';
            }

            this.preferences.setTheme(themeName, styles);
            this.hideSaveContainer();
            this.updateThemePicker(themeName, styles);
            this.AUTONAME = false;
            this.messageService.setProgressResult(successMessage);
        }.bind(this));
    }
    ThemeBuilder.prototype.apply = apply;

    function select(name, styles) {
		var getValue = function(styles, name, atRoot) {
			if (atRoot) {
				/* special cases, the default foreground and background colors */
				if (name === "color" || name === "backgroundColor") { //$NON-NLS-0$
					return styles[name];
				}
			}

			var index = name.indexOf("."); //$NON-NLS-0$
			if (index !== -1) {
				var firstSegment = name.substring(0, index);
				var subStyles = styles[firstSegment];
				if (subStyles) {
					var subName = name.substring(index + 1);
					var subResult = getValue(subStyles, subName, false);
					if (subResult) {
						return subResult;
					}
				}
				name = firstSegment;
			}
			return styles[name] ? styles[name].color || styles[name].backgroundColor : "";
		};

        for (var theme = 0; theme < styles.length; theme++) {
            var style = styles[theme];
            if (style.name === name) {
            	this.rootTheme = style;
            	this.settings.fontSize = null;
                this.settings.name = name;
                for (var setting in this.settings) {
                    if (setting !== "name" && setting !== "fontSize") { //$NON-NLS-0$
						this.settings[setting].value = getValue(style.styles, this.settings[setting].name, true);
                    }
                }
                break;
            }
        }

        clear();
        init();
        this.refresh();
    }
    ThemeBuilder.prototype.select = select;

    function selectFontSize(size) {
        this.settings.fontSize = {
            value: size
        };
        this.revealSaveContainer();
    }
    ThemeBuilder.prototype.selectFontSize = selectFontSize;

    function addFontSizePicker(themeStyles) {
        var currentFont = themeStyles.style.fontSize;
        var picker = document.getElementById('fontsizepicker');
        var options = [];

        function fontSizes(unit) {
            for (var size = 8; size < 19; size++) {
                var set = {
                    value: size + unit,
                    label: size + unit
                };
                if (set.value === currentFont) {
                    set.selected = true;
                }
                options.push(set);
            }
        }

        fontSizes("px");
        fontSizes("pt");

        if (!this.sizeSelect) {
            this.sizeSelect = new Select({
                options: options,
                postChange: this.selectFontSize.bind(this)
            }, picker);
            this.sizeSelect.show();
        }
    }
    ThemeBuilder.prototype.addFontSizePicker = addFontSizePicker;

    function addThemePicker(themeStyles) {
        var options = [];
        var name = themeStyles.style.name;
        var styles = themeStyles.styles;
        for (var theme = 0; theme < styles.length; theme++) {
            var set = {
                value: styles[theme].name,
                label: styles[theme].name
            };
            if (styles[theme].name === name) {
                set.selected = true;
            }
            options.push(set);
        }

        this.select(name, styles);
        var picker = document.getElementById('themepicker');

        if (!this.themeSelect) {
            this.themeSelect = new Select({
                options: options,
                postChange: this.selectTheme.bind(this)
            }, picker);
            this.themeSelect.show();

            var saver = document.getElementById('themesaver');
            this.themeSaver = new TextField({}, saver);
            this.themeSaver.show();
        }
    }
    ThemeBuilder.prototype.addThemePicker = addThemePicker;

    function updateThemePicker(selection, styles) {
        var options = [];

        for (var theme in styles) {
            var set = {
                value: styles[theme].name,
                label: styles[theme].name
            };
            if (selection) {
                if (styles[theme].name === selection) {
                    set.selected = true;
                }
            }

            options.push(set);

            this.themeSelect.destroy();
            var newDiv = document.createElement('div');
            newDiv.id = 'themepicker';
            var picker = document.getElementById('themepicker');
            var fc = picker.firstChild;

            while (fc) {
                picker.removeChild(fc);
                fc = picker.firstChild;
            }

            picker.appendChild(newDiv);
            this.themeSelect = new Select({
                options: options,
                postChange: this.selectTheme.bind(this)
            }, newDiv);
            this.themeSelect.show();
        }
    }
    ThemeBuilder.prototype.updateThemePicker = updateThemePicker;

    function renderData(anchor, state) {
        var data = this.themeData.getViewData();
        if (state && state === 'INITIALIZE') {
            INITIALIZE = true;
        }
        anchor.innerHTML = this.template; // ok--this is a fixed value

        var themeInfo = this.themeData.getThemeStorageInfo();
        var element = document.getElementById('colorstring');
        this.colorFieldId = themeInfo.styleset + 'colorField';
        element.id = this.colorFieldId;
        lib.node('sizecontainer').style.display = this.themeData.fontSettable ? "block" : "none";

        this.drawOutlineData(data);
        this.preferences.getTheme(function(themeStyles) {
            this.addFontSizePicker(themeStyles);
            this.addThemePicker(themeStyles);
        }.bind(this));

		this.commandService.renderCommands('themeCommands', document.getElementById(this.toolbarId || "userCommands"), this, this, "button"); //$NON-NLS-1$ //$NON-NLS-0$
    }
    ThemeBuilder.prototype.renderData = renderData;

    function selectTheme(name) {
        this.preferences.getTheme(function(themeStyles) {
            this.select(name, themeStyles.styles);
            this.apply();
        }.bind(this));
    }
    ThemeBuilder.prototype.selectTheme = selectTheme;

    function addTheme(style) {
        this.preferences.getTheme(function(themeStyles) {
            var themeName = style.name;

            /*
             * If a theme with the same name already exists then update its styles,
             * otherwise just add the whole style.
             */
            for (var i = 0; i < themeStyles.styles.length; i++) {
            	if (themeStyles.styles[i].name === themeName) {
            		var found = true;
            		themeStyles.styles[i].styles = style.styles;
            		break;
            	}
            }
            if (!found) {
            	themeStyles.styles.push(style);
            }

            this.preferences.setTheme(themeName, themeStyles.styles);
            this.select(themeName, themeStyles.styles);
            this.updateThemePicker(themeName, themeStyles.styles);
        }.bind(this));
    }
    ThemeBuilder.prototype.addTheme = addTheme;

    ThemeBuilder.prototype.destroy = function() {
        var picker = this.themeSelect;
        if (picker) {
            picker.destroy();
        }
        var saver = this.themeSaver;
        if (saver) {
            saver.destroy();
        }
        var colorfld = this.colfld;
        if (colorfld) {
            colorfld.destroy();
        }
        var fontsizepicker = this.fontsizepicker;
        if (fontsizepicker) {
            fontsizepicker.destroy();
        }
    };

	function hideSaveContainer() {
        lib.node('pickercontainer').style.display = '';
        lib.node('savecontainer').style.display = 'none'; //$NON-NLS-0$
        this.themeSaver.setValue("");
	}
	ThemeBuilder.prototype.hideSaveContainer = hideSaveContainer;

	function revealSaveContainer() {
		var saveContainer = lib.node('savecontainer'); //$NON-NLS-0$
        if (saveContainer.style.display === 'none') { //$NON-NLS-0$
	        var currentTheme = this.themeSelect.getSelected();
	        this.themeSaver.setValue(currentTheme);
	        lib.node('pickercontainer').style.display = 'none'; //$NON-NLS-1$ //$NON-NLS-0$
	        saveContainer.style.display = '';
	        lib.node('saveButton').onclick = this.saveTheme.bind(this); //$NON-NLS-0$
	        lib.node('revertButton').onclick = this.revertTheme.bind(this); //$NON-NLS-0$
	    }
	}
	ThemeBuilder.prototype.revealSaveContainer = revealSaveContainer;

    function exportTheme() {
    	var result = this.resolveThemeSettings();
        window.alert(JSON.stringify(result));
    }
    ThemeBuilder.prototype.exportTheme = exportTheme;

    function revertTheme() {
		this.hideSaveContainer();
		this.select(this.rootTheme.name, [this.rootTheme]);
    }
    ThemeBuilder.prototype.revertTheme = revertTheme;

    function saveTheme() {
    	var result = this.resolveThemeSettings();
    	var name = this.themeSaver.getValue();
    	result.name = name;
    	result.className = name;
        this.addTheme(result);
		this.hideSaveContainer();
		this.messageService.setProgressResult(successMessage);
    }
    ThemeBuilder.prototype.saveTheme = saveTheme;

    function resolveThemeSettings() {
    	var updateValue = function(segments, styles, value, isBackground, atRoot) {
    		if (atRoot && segments.length === 1 && (segments[0] === "color" || segments[0] === "backgroundColor")) {
    			var style = styles;
    		} else {
				style = styles[segments[0]];
			}

			if (!style) {
				style = {};
				styles[segments[0]] = style;
			}
    		if (segments.length === 1) {
    			if (isBackground) {
    				style.backgroundColor = value;
    			} else {
    				style.color = value;
    			}
    		} else {
    			updateValue(segments.slice(1), style, value, isBackground, false);
    		}
    	};

    	var result = this.rootTheme;
        for (var z in zones) {
            if (!zones[z].paintchip) {
            	var segments = zones[z].family.split("."); //$NON-NLS-0$
            	updateValue(segments, result.styles, zones[z].fill, zones[z].type === "RECTANGLE", true);
            }
        }

        /* handle fontSize setting specially since it's not included in the visual model */
        if (this.settings.fontSize) {
        	result.styles.fontSize = this.settings.fontSize.value;
        }

        return result;
    }
    ThemeBuilder.prototype.resolveThemeSettings = resolveThemeSettings;

    return ThemeBuilder;
});
