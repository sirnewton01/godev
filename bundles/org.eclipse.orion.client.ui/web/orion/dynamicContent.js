/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'require',
	'orion/commands',
	'orion/webui/littlelib',
	'orion/webui/tooltip'
], function(require, Commands, lib, mTooltip){

	/**
	* Progress indicator in form of a simple spinner.
	*
	* @param id [required] unique identifier, e.g. the row number in which the spinner is created
	* @param anchor [required] father DOM node for the created spinner
	*
	* @returns ProgressSpinner object
	*/
	function ProgressSpinner(id, anchor){
		if(id === undefined){ throw new Error("Missing reqired argument: id"); }
		if(anchor === undefined){ throw new Error("Missing reqired argument: anchor"); }
		
		this._id = id;
		this._anchor = anchor;
		
		// we add a prefix for the id label
		this._prefix = "progressSpinner:";
	}
	
	ProgressSpinner.prototype = {
		
		/**
		* [interface] starts the progress indicator
		*/
		start: function(){
			var image = document.createElement("img");
			image.id = this._prefix+this._id;
			image.src = Commands.NO_IMAGE;
			image.className = "progressPane_running";
			this._anchor.appendChild(image);
		},
		
		/**
		* [interface] stops the progress indicator
		*/
		stop: function(){
			var indicator = lib.node(this._prefix+this._id);
			if (indicator) {
				indicator.parentNode.removeChild(indicator);
			}
		},
		
		/**
		* [interface] renders the progress indicator after an population error
		*/
		error: function(err){
			var indicator = lib.node(this._prefix+this._id);
			indicator.src = require.toUrl("images/problem.gif");
			indicator.className = "";
			
			new mTooltip.Tooltip({
				node: indicator,
				text: err
			});
		}
	};
	
	// add constructor
	ProgressSpinner.prototype.constructor = ProgressSpinner;
 
 	/**
	* Default progress indicator in form of three dots.
	*
	* @param id [required] unique identifier, e.g. the row number in which the spinner is created
	* @param anchor [required] father DOM node for the created spinner
	*
	* @returns ProgressDots object
	*/
	function ProgressDots(id, anchor){
		if(id === undefined){ throw new Error("Missing reqired argument: id"); }
		if(anchor === undefined){ throw new Error("Missing reqired argument: anchor"); }
		
		this._id = id;
		this._anchor = anchor;
		
		// we add a prefix for the id label
		this._prefix = "progressDots:";
	}
	
	ProgressDots.prototype = {
		
		/**
		* [interface] starts the progress indicator
		*/
		start: function(){
			var image = document.createElement("span");
			image.id = this._prefix+this._id;
			image.style.textDecoration = "blink";
			image.appendChild(document.createTextNode(" ..."));
			this._anchor.appendChild(image);
		},
		
		/**
		* [interface] stops the progress indicator
		*/
		stop: function(){
			var indicator = lib.node(this._prefix+this._id);
			if (indicator) {
				indicator.parentNode.removeChild(indicator);
			}
		},
		
		/**
		* [interface] renders the progress indicator after an population error
		*/
		error: function(err){
			var indicator = lib.node(this._prefix+this._id);
			indicator.parentNode.removeChild(indicator);
			
			var image = document.createElement("img");
			image.src = require.toUrl("images/problem.gif");
			this._anchor.appendChild(image);
			
			new mTooltip.Tooltip({
				node: indicator,
				text:err
			});
		}
	};
	
	// add constructor
	ProgressDots.prototype.constructor = ProgressDots;
 
	/**
	* Dynamic content model which handles the population logic
	*
	* @param objects [required] collection of objects to be populated
	* @param populate [required] population function (i), which populates the i-th object in the collection
	*
	* @returns DynamicContentModel object
	*/
	function DynamicContentModel(objects, populate){
		if(!objects) { throw new Error("Missing reqired argument: objects"); }
		if(!populate) { throw new Error("Missing reqired argument: populate"); }
	
		this._objects = objects;
		this._populate = populate;
	}
	
	DynamicContentModel.prototype = {
	
		/**
		* [interface] returns the object collection
		*/
		getObjects : function(){
			return this._objects;
		},
		
		/**
		* [interface] returns the deferred for i-th element population
		*/
		getDetails : function(i){
			return this._populate(i);
		}
	};
	
	// add constructor
	DynamicContentModel.prototype.constructor = DynamicContentModel;
 
	/**
	* Dynamic content renderer which provides render methods.
	* After being used in an explorer, the renderer gains access
	* to the explorer through the explorer field
	*
	* @returns DynamicContentRenderer object
	*/
	function DynamicContentRenderer(){ }
	
	DynamicContentRenderer.prototype = {
		// default progress indicator
		progressIndicator : ProgressDots,
		
		// default setup properties
		setupProperties : {
			//progress indicator list
			progressIndicators : []
		},
		
		// default error handler
		errorHandler : function(i, err){
			if (this.explorer.progressIndicators[i]) {
				this.explorer.progressIndicators[i].error(err);
			}
		}
	};
	
	// add constructor
	DynamicContentRenderer.prototype.constructor = DynamicContentRenderer;
 
	/**
	* Dynamic content explorer which allows dynamic population and rendering of the given model
	* @param model [required] dynamic content model to be explored
	*
	* @returns DynamicContentExplorer object
	*/
	function DynamicContentExplorer(model){
		if(!model) { throw new Error("Missing required argument: model"); }	
		this._model = model;
		
		//default renderer
		this.use(new DynamicContentRenderer());
	}
	
	DynamicContentExplorer.prototype = {		
		/**
		* [interface] dynamically populates and renders the model.
		*/
		render : function(){
			var that = this;
		
			//render initial data
			if(this._initialRender){ this._initialRender(); }
			
			//called if the i-th object is successfully populated
			var populationSuccess = function(i){
				return function(){
					//after population work
					that._renderAfterItemPopulation(i);
					
					//stop indicator
					if (that.progressIndicators[i]) {
						that.progressIndicators[i].stop();
					}
				};
			};
			
			//called if the i-th object could not be successfully populated
			var populationFailure = function(i){
				return function(resp){
					if(that._errorHandler) { that._errorHandler(i, resp); }
					else { throw new Error(resp); }
				};
			};
			
			for(var i=0; i<this._model.getObjects().length; i++){
				//before population render work
				this._renderBeforeItemPopulation(i);
				
				//start indicator
				if (this.progressIndicators[i]) {
					this.progressIndicators[i].start();
				}
				
				//population
				this._model.getDetails(i).then(
					populationSuccess(i), populationFailure(i)
				);
			}
			
			//cleanup render work
			if(this._cleanupRender) { this._cleanupRender(); }
		},
		
		/**
		* [interface] extends explorer functionality using the render functions in obj.
		*/
		use : function(obj){
			for(var field in obj){
				if(field === "populateItem"){ this._populateItem = obj.populateItem.bind(obj); obj.explorer = this; }
				else if(field === "renderBeforeItemPopulation"){ this._renderBeforeItemPopulation = obj.renderBeforeItemPopulation.bind(obj); obj.explorer = this; }
				else if(field === "renderAfterItemPopulation"){ this._renderAfterItemPopulation = obj.renderAfterItemPopulation.bind(obj); obj.explorer = this; }
				else if(field === "errorHandler"){ this._errorHandler = obj.errorHandler.bind(obj); obj.explorer = this; }
				else if(field === "initialRender"){ this._initialRender = obj.initialRender.bind(obj); obj.explorer = this; }
				else if(field === "cleanupRender"){ this._cleanupRender = obj.cleanupRender.bind(obj); obj.explorer = this; }
				
				// inherit the progress indicator
				else if(field === "progressIndicator"){ this.progressIndicator = obj.progressIndicator; obj.explorer = this; }
				
				// inherit some setup properties
				else if(field === "setupProperties"){
					for(var property in obj.setupProperties){
						this[property] = obj.setupProperties[property];
					}
					
					obj.explorer = this;
				}
			}
		}
	};
	
	// add constructor
	DynamicContentExplorer.prototype.constructor = DynamicContentExplorer;
	
	return {
		DynamicContentModel : DynamicContentModel,
		DynamicContentExplorer : DynamicContentExplorer,
		DynamicContentRenderer : DynamicContentRenderer,
		ProgressSpinner : ProgressSpinner,
		ProgressDots : ProgressDots
	};
 });