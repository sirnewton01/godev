/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/explorers/explorer', 'orion/section', 'orion/Deferred', 'orion/objects',
		'orion/widgets/input/LabeledCheckbox', 'orion/widgets/input/LabeledTextfield', 
		'orion/widgets/input/LabeledSelect', 'i18n!orion/settings/nls/messages', 'orion/i18nUtil'],
		function(mExplorer, mSection, Deferred, objects, LabeledCheckbox, LabeledTextfield, LabeledSelect, messages, i18nUtil) {
	var Explorer = mExplorer.Explorer, SelectionRenderer = mExplorer.SelectionRenderer, Section = mSection.Section;

	/**
	 * @name orion.settings.ui.PropertyWidget
	 * @class Base mixin for plugin settings widgets.
	 * @description Base mixin for plugin settings widgets.
	 */
	/**
	 * @name orion.settings.ui.PropertyWidget#property
	 * @field
	 * @type orion.metatype.AttributeDefinition
	 */
	var PropertyWidget = function(options) {
		objects.mixin(this, options);
		this.fieldlabel = this.property.getName(); // TODO nls
	};
	objects.mixin(PropertyWidget.prototype, /** @lends orion.settings.ui.PropertyWidget.prototype */ {
		postCreate: function() {
			var property = this.property, config = this.config, properties = config.getProperties();
			var value;
			if (properties && typeof properties[property.getId()] !== 'undefined') { //$NON-NLS-0$
				value = properties[property.getId()];
			} else {
				value = property.getDefaultValue();
			}
			if (typeof this.updateField === 'function') { //$NON-NLS-0$
				this.updateField(value);
			}
		},
		/**
		 * Sets the model value to reflect the given UI event.
		 * @param {Object} uiValue
		 */
		changeProperty: null, /*function() {},*/
		/**
		 * Sets the UI field to reflect the modelValue.
		 * @param {Object} modelValue
		 */
		updateField: null /*function(modelValue) {}*/
	});

	/**
	 * Widget displaying a string-typed plugin setting. Mixes in LabeledTextfield and PropertyWidget.
	 */
	var PropertyTextField = function(options) {
		PropertyWidget.apply(this, arguments);
		LabeledTextfield.apply(this, arguments);
	};
	objects.mixin(PropertyTextField.prototype, LabeledTextfield.prototype, PropertyWidget.prototype, {
		postCreate: function() {
			LabeledTextfield.prototype.postCreate.apply(this, arguments);
			PropertyWidget.prototype.postCreate.apply(this, arguments);
			var type = this.property.getType();
			if (type === 'number') { //$NON-NLS-0$
				this.textfield.type = 'number'; //$NON-NLS-0$
			} else {
				this.textfield.type = 'text'; //$NON-NLS-0$
			}
		},
		change: function(event) {
			this.changeProperty(this.textfield.value);
		},
		updateField: function(value) {
			this.textfield.value = value;
		}
	});

	/**
	 * Widget displaying a boolean-typed plugin setting. Mixes in LabeledCheckbox and PropertyWidget.
	 */
	var PropertyCheckbox = function(options) {
		PropertyWidget.apply(this, arguments);
		LabeledCheckbox.apply(this, arguments);
	};
	objects.mixin(PropertyCheckbox.prototype, LabeledCheckbox.prototype, PropertyWidget.prototype, {
		change: function(event) {
			this.changeProperty(event.target.checked); //$NON-NLS-0$
		},
		postCreate: function() {
			PropertyWidget.prototype.postCreate.call(this);
			LabeledCheckbox.prototype.postCreate.call(this);
		},
		updateField: function(value) {
			this.checkbox.checked = value;
		}
	});

	/**
	 * Widget displaying a plugin setting whose value is restricted to an enumerated set (options). Mixes in LabeledSelect and PropertyWidget.
	 */
	var PropertySelect = function(options) {
		PropertyWidget.apply(this, arguments);
		LabeledSelect.apply(this, arguments);
	};
	objects.mixin(PropertySelect.prototype, LabeledSelect.prototype, PropertyWidget.prototype, {
		postCreate: function() {
			var values = this.property.getOptionValues();
			var labels = this.property.getOptionLabels(); // TODO nls
			this.options = values.map(function(value, i) {
				var label = (typeof labels[i] === 'string' ? labels[i] : value); //$NON-NLS-0$
				return {value: label, label: label};
			});
			LabeledSelect.prototype.postCreate.apply(this, arguments);
			PropertyWidget.prototype.postCreate.apply(this, arguments);
		},
		change: function(event) {
			LabeledSelect.prototype.change.apply(this, arguments);
			var selectedOptionValue = this.property.getOptionValues()[this.getSelectedIndex()];
			if (typeof selectedOptionValue !== 'undefined') { //$NON-NLS-0$
				this.changeProperty(selectedOptionValue);
			}
		},
		updateField: function(value) {
			var index = this.property.getOptionValues().indexOf(value);
			if (index !== -1) {
				this.setSelectedIndex(index);
			}
		}
	});

	/**
	 * Container widget displaying the plugin settings of a single {@link orion.cm.Configuration}. Each setting is
	 * rendered by instantiating an appropriate Property* widget and adding it as a child of this widget.
	 */
	var PropertiesWidget = function(options, parentNode) {
		objects.mixin(this, options);
		if (!parentNode) { throw "parentNode is required"; }
		this.node = parentNode;
		this.config = this.defaultConfig = null;
		this.messageService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
		this.updateMessage = i18nUtil.formatMessage(messages["SettingUpdateSuccess"], this.categoryTitle);
	};
	objects.mixin(PropertiesWidget.prototype, { //$NON-NLS-0$
		createElements: function() {
			var serviceRegistry = this.serviceRegistry;
			var self = this;
			this.children = [];
			this.configAdmin = serviceRegistry.getService('orion.cm.configadmin'); //$NON-NLS-0$
			this.initConfiguration().then(function(configuration) {
				self.createChildren(configuration);
			});
		},
		startup: function() {
			this.createElements();
		},
		destroy: function() {
			if (this.children) {
				this.children.forEach(function(child) {
					child.destroy();
				});
			}
		},
		addChild: function(childWidget) {
			this.children.push(childWidget);
			this.node.appendChild(childWidget.node);
			childWidget.show();
		},
		/** Creates a new configuration if necessary */
		initConfiguration: function() {
			var configuration = this.config;
			if (!configuration) {
				var pid = this.setting.getPid(), self = this;
				this.configPromise = this.configPromise ||
					Deferred.all([
						this.configAdmin.getDefaultConfiguration(pid),
						this.configAdmin.getConfiguration(pid)
					]).then(function(result) {
						self.defaultConfig = result[0];
						self.config = result[1];
						return self.config;
					});
				return this.configPromise;
			} else {
				return new Deferred().resolve(configuration);
			}
		},
		createChildren: function(configuration) {
			var self = this;
			this.setting.getAttributeDefinitions().forEach(function(property) {
				var options = {
					config: configuration,
					property: property,
					changeProperty: self.changeProperty.bind(self, property) ,
					serviceRegistry: self.serviceRegistry
				};
				var widget;
				if (property.getOptionValues()) {
					// Enumeration
					widget = new PropertySelect(options);
				} else {
					switch (property.getType()) {
						case 'boolean': //$NON-NLS-0$
							widget = new PropertyCheckbox(options);
							break;
						case 'number': //$NON-NLS-0$
						case 'string': //$NON-NLS-0$
							widget = new PropertyTextField(options);
							break;
					}
				}
				self.addChild(widget);
			});
		},
		changeProperty: function(attributeDefinition, value) {
			this.initConfiguration().then(function(configuration) {
				var setting = this.setting;
				var props = configuration.getProperties() || {};
				props[attributeDefinition.getId()] = value;
				// Decide if this configuration equals the setting's default values.
				var defaultProps = this.defaultConfig ? this.defaultConfig.getProperties() : null;
				var isNoop = setting.isDefaults(props, defaultProps);
				if (isNoop) {
					// Entire configuration is a no-op (i.e. it equals its default values) so remove it entirely
					configuration.remove();
					this.config = null;
					this.configPromise = null;
				} else {
					configuration.update(props);
				}
				this.messageService.setProgressResult(this.updateMessage);
			}.bind(this));
		}
	});

	/**
	 * Renderer for SettingsList.
	 */
	function SettingsRenderer(settingsListExplorer, serviceRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.childWidgets = [];
		SelectionRenderer.call(this, {cachePrefix: 'pluginSettings', noRowHighlighting: true}, settingsListExplorer); //$NON-NLS-0$
	}
	SettingsRenderer.prototype = new SelectionRenderer();
	SettingsRenderer.prototype.getCellElement = function(col_no, /*Setting*/ setting, rowElement) {
		var sectionId = setting.getPid(), headerId = sectionId + 'header'; //$NON-NLS-0$
		
		var settingSection = document.createElement('section'); //$NON-NLS-0$
		settingSection.id = sectionId;
		settingSection.className = 'setting-row'; //$NON-NLS-0$
		settingSection.setAttribute('role', 'region'); //$NON-NLS-0$ //$NON-NLS-1$
		settingSection.setAttribute('aria-labelledby', headerId); //$NON-NLS-0$

		var sectionHeader = document.createElement('h3'); //$NON-NLS-0$
		sectionHeader.id = headerId;
		// setting-header-generated sets the heading to be 0 width as there are no categories on generated settings pages
		sectionHeader.className = 'setting-header setting-header-generated'; //$NON-NLS-0$
//		sectionHeader.textContent = setting.getName(); // TODO nls

		var propertiesElement = document.createElement('div'); //$NON-NLS-0$
		propertiesElement.className = 'setting-content'; //$NON-NLS-0$
		var propertiesWidget = this.createPropertiesWidget(propertiesElement, setting);
		this.childWidgets.push(propertiesWidget);
		propertiesWidget.startup();

		settingSection.appendChild(sectionHeader);
		settingSection.appendChild(propertiesElement);
		rowElement.appendChild(settingSection);
//		mNavUtils.addNavGrid(this.explorer.getNavDict(), setting, link);
	};
	SettingsRenderer.prototype.createPropertiesWidget = function(parent, setting, serviceRegistry) {
		return new PropertiesWidget({serviceRegistry: this.serviceRegistry, setting: setting, categoryTitle: this.explorer.categoryTitle}, parent);
	};
	SettingsRenderer.prototype.renderTableHeader = function(tableNode) {
		return document.createElement('div'); //$NON-NLS-0$
	};
	SettingsRenderer.prototype.destroy = function() {
		if (this.childWidgets) {
			this.childWidgets.forEach(function(widget) {
				widget.destroy();
			});
		}
		this.childWidgets = null;
	};
	/**
	 * Explorer for SettingsList.
	 */
	function SettingsListExplorer(serviceRegistry, categoryTitle) {
		Explorer.call(this, serviceRegistry, undefined, new SettingsRenderer(this, serviceRegistry));
		this.categoryTitle = categoryTitle;
	}
	SettingsListExplorer.prototype = new Explorer();
	SettingsListExplorer.prototype.destroy = function() {
		if (this.renderer) {
			this.renderer.destroy();
		}
	};

	/**
	 * Widget showing list of Plugin Settings.
	 * Requires the 'orion.cm.configadmin' service.
	 * @param {DomNode|String} options.parent
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry
	 * @param {orion.settings.Settings[]} options.settings
	 */
	function SettingsList(options) {
		var parent = options.parent;
		var serviceRegistry = options.serviceRegistry;
		var settings = options.settings;
		if (!options.parent || !options.serviceRegistry || !options.settings || !options.title) {
			throw new Error('Missing required option'); //$NON-NLS-0$
		}
		this.parent = typeof parent === 'string' ? document.getElementById('parent') : parent; //$NON-NLS-0$ //$NON-NLS-1$
		// TODO add commands
		this.render(parent, serviceRegistry, settings, options.title);
	}
	SettingsList.prototype = {
		_makeSection: function(parent, sectionId, setting, title) {
			var section = new Section(parent, { id: sectionId, title: title, useAuxStyle: true,
				canHide: false});
			return section;
		},
		destroy: function() {
			this.explorer.destroy();
		},
		render: function(parent, serviceRegistry, settings, categoryTitle) {
			// FIXME Section forces a singleton id, bad
			var idPrefix = 'pluginsettings-'; //$NON-NLS-0$
			
			for (var i=0; i<settings.length; i++) {
				var sectionId = idPrefix + 'section' + i; //$NON-NLS-0$
				var setting = settings[i];
				var section = this._makeSection(parent, sectionId, setting, setting.getName() || "Unnamed"); //$NON-NLS-0$
				// Add a class name based on the category (all settings on the page have the same category currently)
				if(setting.category){
					// This does not match the full spec of legal class names, but we avoid categories breaking the UI, Bug 444194
					var className = setting.category.replace(/[^_0-9a-zA-Z-]/gi, '-') + "SettingsTable"; //$NON-NLS-0$ //$NON-NLS-1$
					section.getContentElement().classList.add(className);
				}
				
				this.explorer = new SettingsListExplorer(serviceRegistry, categoryTitle);
				this.explorer.createTree(section.getContentElement().id, new mExplorer.SimpleFlatModel([setting], 'setting-', //$NON-NLS-0$
					function(item) {
						return item.getPid();
					}),
					{	tableElement: 'div', //$NON-NLS-0$
						tableBodyElement: 'div', //$NON-NLS-0$
						tableRowElement: 'div', //$NON-NLS-0$
						noSelection: true, // Until we support selection based commands, don't allow selection
					});
			}
		}
	};

	return SettingsList;
});
