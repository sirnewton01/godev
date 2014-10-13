/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/webui/littlelib', 'orion/objects'], function(lib, objects){
	/**
	 * A wizard widget
	 * 
	 * @param options.parent {Node|String} Parent node or parent node id
	 * @param options.pages {Array[WizardPage]} Array of wizard pages
	 * @param option.commonPane {WizardPage} A pane that will be displayed on every page. Optional
	 * @param options.validate {function(int)} Function that validates page of a given number, pages numbered from 0
	 * @param options.size.width {String} Wizard pane width (css style, for instance "200px")
	 * @param options.size.height {String} Wizard pane height (css style, for instance "200px")
	 * @param buttonNames {Object} Overwrite button names for properties: cancel, back, ok, next
	 * @param onSubmit function(Object) Function called when wizard is submitted with results govered from pages as an argument
	 * @param onCancel function() Function called when wizard is cancelled
	 */
	function Wizard(options){
		this._init(options);
	}
	
	Wizard.constructor = Wizard;
	
	Wizard.prototype = {
		buttonNames: {cancel: "CANCEL", back: "< Back", ok: "OK", next: "Next >"},
		_init: function(options){
			this.parent = typeof options.parent === "string" ? lib.node(options.parent) : options.parent;
			this.pages = options.pages;
			this.onSubmit = options.onSubmit;
			this.onCancel = options.onCancel;
			if(options.validate){
				this.validate = options.validate;
			}
			if(options.buttonNames){
				objects.mixin(this.buttonNames, options.buttonNames);
			}
			this.commonPane = options.commonPane;
			if(options.size){
				this.size = {
					width: options.size.width,
					height: options.size.height
				};
			} else {
				this.size = {};
			}
			this.render();
		},
		_pagesNodes: [],
		_renderPage: function(){
			for(var i=0; i<this._pagesNodes.length; i++){
				if(i===this.currentPage){
					continue;
				}
				this._pagesNodes[i].style.display = "none";
			}
			if(this._pagesNodes[this.currentPage]){
				this._pagesNodes[this.currentPage].style.display = "";
			} else {
				this._pagesNodes.push(this.pages[this.currentPage]._construct(this.currentPage, this));
				this._pagesNode.appendChild(this._pagesNodes[this.currentPage]);
				this.pages[this.currentPage].render();
			}
			this.backButton.style.display = this.currentPage===0 ?  "none" : "";
			this.nextButton.style.display = this.currentPage===this.pages.length-1 ?  "none" : "";
			this.validate(this.currentPage);
		},
		_renderCommonPane: function(){
			if(!this.commonPane){
				return;
			}
			var renderedCommonPane = this.commonPane._construct(null, this);
			this._commonPaneNode.appendChild(renderedCommonPane);
			this.commonPane.render();
		},
		_renderButtons: function(){
			this.backButton = document.createElement("button");
			this.backButton.className = "orionButton commandButton";
			this.backButton.type = "button";
			this.backButton.id = "backButton";
			this.backButton.value = "BACK";
			this.backButton.style.display = "none";
			this.backButton.appendChild(document.createTextNode(this.buttonNames.back));
			this._buttonsNode.appendChild(this.backButton);
			
			this.cancelButton = document.createElement("button");
			this.cancelButton.className = "orionButton commandButton";
			this.cancelButton.type = "button";
			this.cancelButton.id = "cancelButton";
			this.cancelButton.value = "CANCEL";
			this.cancelButton.style.display = "";
			this.cancelButton.appendChild(document.createTextNode(this.buttonNames.cancel));
			this._buttonsNode.appendChild(this.cancelButton);
			
			this.okButton = document.createElement("button");
			this.okButton.className = "orionButton commandButton okButton";
			this.okButton.type = "button";
			this.okButton.id = "okButton";
			this.okButton.value = "OK";
			this.okButton.appendChild(document.createTextNode(this.buttonNames.ok));
			this._buttonsNode.appendChild(this.okButton);
			
			this.nextButton = document.createElement("button");
			this.nextButton.className = "orionButton commandButton";
			this.nextButton.type = "button";
			this.nextButton.id = "nextButton";
			this.nextButton.value = "NEXT";
			this.nextButton.appendChild(document.createTextNode(this.buttonNames.next));
			this._buttonsNode.appendChild(this.nextButton);
			
			this.nextButton.addEventListener('click', this.next.bind(this));
			this.backButton.addEventListener('click', this.back.bind(this));
			this.okButton.addEventListener('click', function(){
				if(this.validate(undefined, function(valid){
					if(valid){
						this.onSubmit(this.getResults());					
					}
				}.bind(this))){
				};
			}.bind(this));
			this.cancelButton.addEventListener('click', this.onCancel);
		},
		_setButtonEnabled: function(button, enabled){
			if(enabled){
				button.classList.remove("disabled");
			} else {
				button.classList.add("disabled");
			}
			button.disabled = !enabled;
		},
		next: function(){
			if(this.currentPage<(this.pages.length - 1)){
				this.currentPage++;
			}
			this._renderPage();
		},
		back: function(){
			if(this.currentPage>0){
				this.currentPage--;
			}
			this._renderPage();
		},
		render: function(){
			this._pagesNode = document.createElement("div");
			this._pagesNode.className = "wizardPage";
			if(this.size.height){
				this._pagesNode.style.height = this.size.height;
			}
			this.parent.appendChild(this._pagesNode);
			if(this.commonPane){
				this._commonPaneNode = document.createElement("div");
				this._commonPaneNode.className = "wizardCommonPane";
				this.parent.appendChild(this._commonPaneNode);
			}
			this._buttonsNode = document.createElement("div");
			this._buttonsNode.className = "wizardButtonRow";
			this.parent.appendChild(this._buttonsNode);
			if(this.size.width){
				this._pagesNode.style.width = this.size.width;
				this._buttonsNode.style.width = this.size.width;
				if(this.commonPane){
					this._commonPaneNode.style.width = this.size.width;
				}
			}
			this._renderButtons();
			this._renderPage();
			this._renderCommonPane();
		},
		validate: function(page_no, setValid){
			if(typeof page_no === "undefined"){
				page_no = this.currentPage;
			}
			this.pages[page_no].validate(function(valid){
				this._setButtonEnabled(this.okButton, valid);
				this._setButtonEnabled(this.nextButton, valid);
				if(setValid) setValid(valid);
			}.bind(this));
			if(this.commonPane){
				this.commonPane.validate(function(valid){
					if(!valid){
						this._setButtonEnabled(this.okButton, false);						
					}
				});
			}
		},
		getResults: function(){
			var results = {};
			this.pages.forEach(function(page){
				objects.mixin(results, page.getResults());
			});
			if(this.commonPane){
				objects.mixin(results, this.commonPane.getResults());
			}
			return results;
		},
		currentPage: 0
	};
	
	/**
	 * @param options.template {String} HTML template of the page
	 * @param options.render {function} Function rendering the page in the template
	 * @param options.validate {function{function(boolean)}} Function validating the pane, passing true or false to the callback function on argument
	 * @param options.getResults {function} Function returning the results from the page in json format
	 */
	function WizardPage(options){
		this._init(options);
	}
	
	WizardPage.constructor = WizardPage;
	
	WizardPage.prototype = {
		_init: function(options){
			if(options.template){
				this.TEMPLATE = options.template;
			}
			if(options.render){
				this.render = options.render;
			}
			if(options.validate){
				this.validate = options.validate;
			}
			if(options.getResults){
				this.getResults = options.getResults;
			}
		},
		TEMPLATE: "",
		_construct: function(page_no, wizard){
			this.wizard = wizard;
			var parent = document.createElement("div");
			parent.id = "page_" + page_no;
			parent.innerHTML = this.TEMPLATE;
			return parent;
		},
		render: function(){
			
		},
		validate: function(setValid){
			setValid(true);
		},
		getResults: function(){
			return {};
		}
	}
	
	return {
		Wizard: Wizard,
		WizardPage: WizardPage
	};
});