/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global window console define localStorage*/
/*jslint browser:true forin:true*/

define(['i18n!orion/settings/nls/messages', 'orion/commands', 'orion/commandRegistry', 'orion/globalCommands', 'orion/PageUtil', 'orion/webui/littlelib',
    'orion/widgets/themes/ThemeComponent', 'orion/widgets/themes/editor/ThemeData', 'orion/widgets/input/Select', 'orion/widgets/input/TextField'],

function(messages, mCommands, mCommandRegistry, mGlobalCommands, PageUtil, lib, Component, ThemeData, Select, TextField) {

    var TOP = 10;
    var LEFT = 10;
    var UI_SIZE = 350;

    var SELECTED_ZONE = null;
    var OVERVIEW = true;
    var INITIALIZE = true;
    var OUTLINEDATA = false;
    var ARCS = true;

    var zones = [];
    var canvas = null;
    var ctx = null;

    var over = null;
    var settings = [];

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

    function Family(familyname, familyvalue) {
        this.name = familyname;
        this.value = familyvalue;
    }

    var familyname;
    var familyvalue;

    Family.prototype.name = familyname;
    Family.prototype.value = familyvalue;

    var newExportThemeNameParameter = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages['Theme name:'], messages['yourTheme'])]); //$NON-NLS-1$ //$NON-NLS-0$

    function ThemeBuilder(args) {

        this.settings = [];

        this.themeData = args.themeData;

        this.toolbarId = args.toolbarId;

        init();

        var commandTemplate = '<div id="commandButtons">' +
            '<div id="revertCommands" class="layoutRight sectionActions"></div>' +
            '<div id="userCommands" class="layoutRight sectionActions"></div>' +
            '</div>';

        var commandArea = document.getElementById('pageActions');
        commandArea.innerHTML = commandTemplate;

        this.commandService = args.commandService;
        this.preferences = args.preferences;

        var revertCommand = new mCommands.Command({
            name: messages["Cancel"],
            tooltip: messages["Revert Theme"],
            id: "orion.reverttheme", //$NON-NLS-0$
            callback: function(data) {
                this.revert(data.items);
            }.bind(this)

        });

        var updateCommand = new mCommands.Command({
            name: messages["Update"],
            tooltip: messages["Update Theme"],
            id: "orion.applytheme", //$NON-NLS-0$
            callback: function(data) {
                this.apply(data.items);
            }.bind(this)

        });

        var guideCommand = new mCommands.Command({
            name: messages["Show Guide"],
            tooltip: messages["Check Guide"],
            id: "orion.checkGuide", //$NON-NLS-0$
            callback: function(data) {
                this.guide(data.items);
            }.bind(this)

        });

        var exportCommand = new mCommands.Command({
            name: messages.Export,
            tooltip: messages['Export a theme'],
            id: "orion.exportTheme", //$NON-NLS-0$
            parameters: newExportThemeNameParameter,
            callback: function(data) {
                var themeName;
                if (data.parameters && data.parameters.valueFor('name')) { //$NON-NLS-0$
                    themeName = data.parameters.valueFor('name'); //$NON-NLS-0$
                } else {
                    themeName = 'yourTheme'; //$NON-NLS-0$
                }
                this.exportTheme(data.items, themeName);
            }.bind(this)

        });

        this.commandService.addCommand(guideCommand);
        this.commandService.registerCommandContribution('themeCommands', "orion.checkGuide", 1); //$NON-NLS-1$ //$NON-NLS-0$

        this.commandService.addCommand(revertCommand);
        this.commandService.registerCommandContribution('themeCommands', "orion.reverttheme", 2); //$NON-NLS-1$ //$NON-NLS-0$

        this.commandService.addCommand(updateCommand);
        this.commandService.registerCommandContribution('themeCommands', "orion.applytheme", 3); //$NON-NLS-1$ //$NON-NLS-0$

        this.commandService.addCommand(exportCommand);
        this.commandService.registerCommandContribution('themeCommands', "orion.exportTheme", 5); //$NON-NLS-1$ //$NON-NLS-0$
    }

    function applyColor() {

        var newcolor = document.getElementById(this.themebuilder.colorFieldId).firstChild.value;

        if (this.themebuilder.validateHex(newcolor)) {

            zones[SELECTED_ZONE.id].fill = newcolor;
            this.themebuilder.updateFamily(zones[SELECTED_ZONE.id].family, newcolor);
            OVERVIEW = false;
            this.themebuilder.refresh();
            zones[SELECTED_ZONE.id].glow(UI_SIZE, TOP);
            this.themebuilder.drawPicker(ctx, zones[SELECTED_ZONE.id]);

            lib.node('pickercontainer').style.display = 'none';
            lib.node('savecontainer').style.display = '';
            lib.node('stringcontainer').style.display = '';
        }
    }

    ThemeBuilder.prototype.applyColor = applyColor;

    ThemeBuilder.prototype.colorFieldId = colorFieldId;

    ThemeBuilder.prototype.settings = settings;

    var AUTONAME = false;

    ThemeBuilder.prototype.AUTONAME = AUTONAME;


    ThemeBuilder.prototype.template = '<div id="themeContainer">' +
        '<canvas id="orionui" width="800" height="380""></canvas>' +
        '<div id="pickercontainer" style="display:block;">' +
        '<span class="settingsLabel">' + messages["Theme:"] +
        '</span>' +
        '<div id="themepicker" class="themepicker"></div>' +
        '</div>' +
        '<div id="savecontainer" style="display:none;">' +
        '<span class="settingsLabel">' + messages["New Theme Name:"] +
        '</span>' +
        '<div id="themesaver" class="themesaver"></div>' +
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
        '<button class="commandButton" style="padding:5px;font-size:9pt;" type="button" id="colorButton">' + messages["Ok"] +
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

        var regColorcode = /^(#)?([0-9a-fA-F]{3})([0-9a-fA-F]{3})?$/;

        var validity = true;

        if (regColorcode.test(hexcode) === false) {
            validity = false;
        }

        return validity;
    }

    ThemeBuilder.prototype.validateHex = validateHex;

    /* MOUSE EVENTS */

    function clear() {
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var w = canvas.width;
            var h = canvas.height;
            canvas.width = w;
            canvas.height = h;
        }
    }

    ThemeBuilder.prototype.clear = clear;

    function refresh() {
        this.clear();

        if (OUTLINEDATA === true) {
            this.drawOutlineData();
        }
    }

    ThemeBuilder.prototype.refresh = refresh;

    function getCoordinates(e) {

        var x, y;

        var rect = canvas.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;

        return {
            x: x,
            y: y
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

    function mouseUp(e) {
        canvas.style.cursor = "";
    }

    function updateFamily(family, fill) {
        for (var z = 0; z < zones.length; z++) {
            if (zones[z].family) {
                if (zones[z].family === family) {
                    zones[z].fill = fill;
                }

                for (var s in this.settings) {
                    if (this.settings[s].name === family) {
                        this.settings[s].value = fill;
                        break;
                    }
                }
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

        if (ARCS === true) {
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

        var stringcontainer = document.getElementById('stringcontainer');
        stringcontainer.style.display = '';
        stringcontainer.zIndex = 1;


        var colorstring = document.getElementById(this.colorFieldId);

        if (!this.colfld) {
            this.colfld = new TextField({}, colorstring);
            this.colfld.show();
            this.colfld.width('100px');
        }
        var colorButton = document.getElementById('colorButton');
        colorButton.themebuilder = this;
        colorButton.onclick = this.applyColor;
    }

    ThemeBuilder.prototype.drawPicker = drawPicker;

    var colfld;
    ThemeBuilder.prototype.colfld = colfld;

    function mouseDown(e) {

        OVERVIEW = false;

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

            if (over.length > 0) {
                OVERVIEW = true;
            } else {
                OVERVIEW = false;
            }

            switch (over[smallest].type) {

                case 'ELLIPSE':
                    zones[SELECTED_ZONE.id].fill = over[smallest].fill;
                    this.updateFamily(zones[SELECTED_ZONE.id].family, over[smallest].fill);
                    OVERVIEW = false;
                    this.refresh();
                    zones[SELECTED_ZONE.id].glow(UI_SIZE, TOP);
                    this.drawPicker(ctx, zones[SELECTED_ZONE.id]);

                    lib.node('pickercontainer').style.display = 'none';
                    lib.node('savecontainer').style.display = '';

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

    function overview(ctx, components) {

        var x = UI_SIZE + 40;
        var padding = 6;
        var families = [];
        var labely = 0;

        var count = 0;

        for (var c = 0; c < components.length; c++) {

            var component = components[c];

            if (familyShown(families, component.family) === false && component.description) {

                labely = TOP + 10 + (count * 28);

                var originx = Math.floor(component.x - padding + (component.width + (2 * padding)) / 2);
                var originy = Math.floor(component.y - padding + (component.height + (2 * padding)) / 2);

                var color = 'rgba(187,0,0,0.7)';
                switch (component.family) {

                    case 'background':

                        /* This is a hack to stop lines overlapping - ideally this software needs a layout
								routine. Not pleased to do this. */

                        ctx.beginPath();
                        ctx.moveTo(originx + 70 + 0.5, labely - 4 + 0.5);
                        ctx.lineTo(UI_SIZE + 50 + 0.5, labely - 4 + 0.5);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        Component.drawArc(ctx, originx + 70, labely - 4, 3, 0, 2 * Math.PI, false, null, color);

                        break;


                    case 'Side':

                        ctx.beginPath();
                        ctx.moveTo(originx + 30 + 0.5, labely - 4 + 0.5);
                        ctx.lineTo(UI_SIZE + 50 + 0.5, labely - 4 + 0.5);
                        ctx.strokeStyle = 'rgba(187,0,0,0.7)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        Component.drawArc(ctx, originx + 30, labely - 4, 3, 0, 2 * Math.PI, false, null, color);

                        break;

                    default:

                        ctx.moveTo(originx + 0.5, originy + 0.5);
                        ctx.lineTo(originx + 0.5, labely - 4 + 0.5);
                        ctx.lineTo(UI_SIZE + 50 + 0.5, labely - 4 + 0.5);
                        ctx.strokeStyle = 'rgba(187,0,0,0.7)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        Component.drawArc(ctx, originx, originy, 3, 0, 2 * Math.PI, false, null, color);

                        break;
                }

                ctx.globalAlpha = 1;

                Component.drawText(ctx, component.description, LEFT + 5 + x, labely, 'bold 8pt sans-serif', '#333');

                if (component.family) {
                    families.push(component.family);
                }

                count++;
            }
        }

        Component.drawText(ctx, messages.clickDiagram, LEFT + 5 + x, labely + 50, 'bold 8pt sans-serif', '#cc0000');
        Component.drawText(ctx, messages.clickUpdate, LEFT + 5 + x, labely + 65, 'bold 8pt sans-serif', '#cc0000');

        var stringcontainer = document.getElementById('stringcontainer');
        stringcontainer.style.display = 'none';
    }

    ThemeBuilder.prototype.overview = overview;

    function getCurrentSettings() {
        return this.settings;
    }

    ThemeBuilder.prototype.getCurrentSettings = getCurrentSettings;


    function addData(data) {

        this.settings = [];

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


    function drawShape(shapedata, fillcolor, linecolor) {

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

        if (INITIALIZE === true) {

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

        if (OVERVIEW) {
            overview(ctx, zones);
        }
    }

    ThemeBuilder.prototype.drawOutlineData = drawOutlineData;

    function apply(data) {

        /* New Theme defined */
        this.preferences.getTheme(function(themeStyles) {
            var themename = this.settings.name;

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

                themename = name;

                themesaver.firstChild.value = '';
            }

            this.preferences.setTheme(themename, styles);
            if (this.settings.fontSize) {
                this.preferences.setFontSize(this.settings.fontSize.value);
            }
            lib.node('savecontainer').style.display = 'none';
            lib.node('pickercontainer').style.display = '';
            this.updateThemePicker(themename, styles);
            this.AUTONAME = false;
        }.bind(this));
    }

    ThemeBuilder.prototype.apply = apply;

    function revert(data) {
        this.guide();
        lib.node('pickercontainer').style.display = '';
        lib.node('savecontainer').style.display = 'none';
        this.AUTONAME = false;
    }

    ThemeBuilder.prototype.revert = revert;

    function guide(data) {
        this.refresh();
        OVERVIEW = true;
        data = this.themeData.getViewData();
        this.drawOutlineData(data);
        lib.node('stringcontainer').style.display = 'none';
    }

    ThemeBuilder.prototype.guide = guide;

    function select(name, styles) {

        for (var theme = 0; theme < styles.length; theme++) {

            var style = styles[theme];

            if (style.name === name) {

                this.settings.name = name;

                for (var setting in this.settings) {
                    if (setting !== 'name') {
                        var item = this.settings[setting].name;
                        this.settings[setting].value = style[item];
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
    }

    ThemeBuilder.prototype.selectFontSize = selectFontSize;

    function updateFontSizePicker(selected) {

        var options = [];

        for (var size = 8; size < 19; size++) {

            var set = {
                value: size + 'pt',
                label: size + 'pt'
            };

            if (size === selected) {
                set.selected = 'true';
            }

            options.push(set);
        }

        this.sizeSelect.destroy();
        var newdiv = document.createElement('div');
        newdiv.id = 'fontsizepicker';
        var container = document.getElementById('sizecontainer');
        container.appendChild(newdiv);
        this.sizeSelect = new Select({
            options: options
        }, newdiv);
        this.sizeSelect.setStorageItem = this.selectFontSize.bind(this);
        this.sizeSelect.show();
    }

    ThemeBuilder.prototype.updateFontSizePicker = updateFontSizePicker;

    function addFontSizePicker(themeStyles) {

        var currentFont = themeStyles.style.fontSize;

        var container = document.getElementById('sizecontainer');
        var picker = document.getElementById('fontsizepicker');

        var options = [];

        for (var size = 8; size < 19; size++) {

            var set = {
                value: size + 'pt',
                label: size + 'pt'
            };

            if (set.value === currentFont) {
                set.selected = 'true';
            }

            options.push(set);
        }

        if (!this.sizeSelect) {
            this.sizeSelect = new Select({
                options: options
            }, picker);
            this.sizeSelect.setStorageItem = this.selectFontSize.bind(this);
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
                options: options
            }, picker);
            this.themeSelect.setStorageItem = this.selectTheme.bind(this);
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
            var newdiv = document.createElement('div');
            newdiv.id = 'themepicker';
            var picker = document.getElementById('themepicker');

            var fc = picker.firstChild;

            while (fc) {
                picker.removeChild(fc);
                fc = picker.firstChild;
            }

            picker.appendChild(newdiv);
            this.themeSelect = new Select({
                options: options
            }, newdiv);
            this.themeSelect.setStorageItem = this.selectTheme.bind(this);
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

        this.commandService.renderCommands('themeCommands', document.getElementById(this.toolbarId || "revertCommands"), this, this, "button"); //$NON-NLS-1$ //$NON-NLS-0$		
    }

    ThemeBuilder.prototype.renderData = renderData;

    function selectTheme(name) {
        this.preferences.getTheme(function(themeStyles) {
            this.select(name, themeStyles.styles);
        }.bind(this));
    }

    ThemeBuilder.prototype.selectTheme = selectTheme;

    function addTheme(style) {
        this.preferences.getTheme(function(themeStyles) {
            var themename = style.name;
            themeStyles.styles.push(style);
            this.preferences.setTheme(themename, themeStyles.styles);
            this.select(themename, themeStyles.styles);
            this.updateThemePicker(themename, themeStyles.styles);
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


    function exportTheme(data, themeName) {
        var dat = {};
        for (var z in zones) {
            if (!zones[z].paintchip) {
                console.log(zones[z]);
                var zone = zones[z];
                if (zone.family === 'lineNumber' && !dat.hasOwnProperty('lineNumber')) {
                    dat.lineNumber = zone.fill;
                } else if (zone.family === 'background' && !dat.hasOwnProperty('background')) {
                    dat.background = zone.fill;
                } else if (zone.family === 'string' && !dat.hasOwnProperty('string')) {
                    dat.string = zone.fill;
                } else if (zone.family === 'text' && !dat.hasOwnProperty('text')) {
                    dat.foreground = zone.fill;
                } else if (zone.family === 'currentLine' && !dat.hasOwnProperty('currentLine')) {
                    dat.selectionBackground = zone.fill;
                } else if (zone.family === 'comment' && !dat.hasOwnProperty('comment')) {
                    dat.singleLineComment = zone.fill;
                } else if (zone.family === 'keyword' && !dat.hasOwnProperty('keyword')) {
                    dat.keyword = zone.fill;
                } else if (zone.family === 'overviewRuler' && !dat.hasOwnProperty('overviewRuler')) {
                    dat.overviewRuler = zone.fill;
                } else if (zone.family === 'annotationRuler' && !dat.hasOwnProperty('annotationRuler')) {
                    dat.annotationRuler = zone.fill;
                } else if (zone.family === 'attribute' && !dat.hasOwnProperty('attribute')) {
                    dat.attribute = zone.fill;
                }
            }
        }
        dat.themeName = themeName;
        // During import, a color of background is used for both overviewRuler, anntationRuler. Export them for future enhancement.
        // During import, attribute is not handled. Export it for future enhancement.
        var currentStyle = '<colorTheme id="0" name="#themeName"><background color="#background"/><singleLineComment color="#singleLineComment"/>' +
            '<keyword color="#keyword"/><foreground color="#foreground"/><string color="#string"/><lineNumber color="#lineNumber"/><selectionBackground color="#selectionBackground"/>' +
            '<overviewRuler color="#overviewRuler"/><annotationRuler color="#annotationRuler"/><attribute color="#attribute"/>' +
            '</colorTheme>';
        for (var key in dat) {
            currentStyle = currentStyle.replace('#' + key, dat[key]);
        }
        window.alert(currentStyle);
    }

    ThemeBuilder.prototype.exportTheme = exportTheme;

    return ThemeBuilder;
});