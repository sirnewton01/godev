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
/*eslint-env browser, amd*/
define(['i18n!orion/settings/nls/messages', 'orion/objects', 'orion/webui/littlelib'], function(messages, objects, lib) {

	function setBounds(node, bounds) {
		var style = node.style; //$NON-NLS-0$
		style.left = bounds.left + "px"; //$NON-NLS-0$
		style.top = bounds.top + "px"; //$NON-NLS-0$
		style.width = bounds.width + "px"; //$NON-NLS-0$
		style.height = bounds.height  + "px"; //$NON-NLS-0$
	}

	function ServiceCarousel(options, parentNode) {
		objects.mixin(this, options);
		this.node = document.createElement("div");
		if (!this.node) { throw new Error("parentNode is required"); }
		parentNode.appendChild(this.node);
	}
	objects.mixin(ServiceCarousel.prototype, {
		serviceState: false,
		pointer: 0,
		box: null,
		
		closedIcon: "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAwAAAANCAYAAACdKY9CAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wCCQ46FewKfYYAAAF4SURBVCjPbZEvyFNhGMV/590ciANhjNs2nC66osHiJ8b9cdVgN4uKyWbRaDGZBIvwYRB2723WBUEEy5igYeZxYQzd7t2x7IUFn/bAOec55zxK05TxeEyWZZds3wEeAXeBP8An4I3tr5PJZJemKQLIsiyxfQ6c8f95V1XVw+l0utdsNrsInEsaA5akE6Btx/3Vfr9/HiTdOIIBKMsS29gGOCU/bTQanWD7QVQry1Lz+ZzFYsFutyOEgCQkGbhg+1Zd0vRIkG2KomC5XLJarej3+3S7XUII8dJZHehIihaQxHq9ZrvdUhQFzWaTdrvNEXO1DvwCrkSjh8OBJEnodrv0ej1arVZMD/CjLumj7SexoSRJGAwGdDodarVaBFqSbH9WlmU3gS9RHSCEgG1iw8fW/gLXAvDd9gfbhBAIIThmOf4hZnux2Wx+CyDP88tVVb2XdC9mOVUHXo9Go8eSCFmWMRwOC+A+cBt4C/y0/c32S+C6pGeSyPOcfyAyt4A7QPcNAAAAAElFTkSuQmCC", //$NON-NLS-0$
		openIcon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAMCAYAAAC5tzfZAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wCCQ46NddkXU4AAAFuSURBVCjPXZG/q9NwFMU/5yYQOhVKoF1SDK9OOjl1URxcQl+G5/LgLeJf4K7wRjdBxMXRxcFR6TfZ3e3iUGe3DKXYQSEk10GjwbPdy+X8uEdVVVEUBVVVJcBt4MrdHwI3gG/u/lHSO3f/vNlsfoQQEEBd19O+799IunR3JAHg7gxw92Bmj4uiaLTdbifAe0nnkvDfl+IfxvMnSUUs6Q5wLom+7+m6TmMFSYrjeFjcdfd7MfBozLjb7WiaBjPD3ZlOp6zXa8VxPNh9YsCDgdTMmM/nHI9H9vs9TdOQpilRFI3cct+A7+PgWZaxXC5JkoQsy8jznP/w04Aw2JNEFEXkec5isWC1WjGZTIZvDrk+KIRwC/jyJzQAfd9zOByYzWZ/s42wNklfgZejXtzMSNMUMxsrALx1952G46qqnrr7tZklQ8EjhRZ40XXddVmWrdV1jSROp9Nz4MzdL4BX7h6A18ClpJtt2z4ry7INIfAL982ks01Z8EgAAAAASUVORK5CYII=", //$NON-NLS-0$
	
		templateString:'<div class="plugin-service-carousel" ><div class="serviceContainer"><div class="serviceContainerClosed" tabindex="0" role="button" aria-pressed="false">${Services}</div>' + //$NON-NLS-2$ //$NON-NLS-0$
						'<div class="serviceCount">0</div></div>' + //$NON-NLS-0$
					   '<div class="serviceRails serviceRailsHidden" tabindex="0" role="group">' + //$NON-NLS-0$
		                  '<div class="leftButton leftButtonArea" role="presentation">' + //$NON-NLS-0$
		                    '<span class="leftCarousel carouselControl">&lt;</span>' + //$NON-NLS-0$
		                  '</div>' + //$NON-NLS-0$
		                  '<div class="listContainer" role="presentation">' + //$NON-NLS-0$
							'<ul class="serviceList"></ul>' + //$NON-NLS-0$
		                  '</div>' + //$NON-NLS-0$
		                  '<div class="rightButton rightButtonArea" role="presentation">' +  //$NON-NLS-0$
							'<span class="rightCarousel carouselControl">&gt;</span>' +  //$NON-NLS-0$
		                  '</div>' + //$NON-NLS-0$
		               '</div></div>', //$NON-NLS-0$

		createElements: function() {
			this.node.innerHTML = this.templateString;
			lib.processTextNodes(this.node, messages);
			var label = this.serviceLabel = lib.$('.serviceContainerClosed', this.node); //$NON-NLS-0$
			this.serviceCount = lib.$('.serviceCount', this.node); //$NON-NLS-0$
			var rails = this.rails = lib.$('.serviceRails', this.node); //$NON-NLS-0$
			this.leftbutton = lib.$('.leftButton', this.node); //$NON-NLS-0$
			this.listContainer = lib.$('.listContainer', this.node); //$NON-NLS-0$
			this.testlist = lib.$('.serviceList', this.node); //$NON-NLS-0$
			this.rightbutton = lib.$('.rightButton', this.node); //$NON-NLS-0$

			lib.$('.leftCarousel', this.node).addEventListener('click', this.slideLeft.bind(this)); //$NON-NLS-0$
			lib.$('.rightCarousel', this.node).addEventListener('click', this.slideRight.bind(this)); //$NON-NLS-0$
			label.addEventListener('click', this.showServices.bind(this));      //$NON-NLS-0$
			label.addEventListener('keypress', this.onServiceClick.bind(this)); //$NON-NLS-0$
			rails.addEventListener('mouseenter', this.showButtons.bind(this));  //$NON-NLS-0$
			rails.addEventListener('mouseleave', this.hideButtons.bind(this));  //$NON-NLS-0$
			rails.addEventListener('focus', this.showButtons.bind(this));       //$NON-NLS-0$
			rails.addEventListener('blur', this.hideButtons.bind(this));        //$NON-NLS-0$ 
			rails.addEventListener('keypress', this.handleKeypress.bind(this)); //$NON-NLS-0$

			this.postCreate();
		},

		destroy: function() {
			if (this.node) {
				this.node = this.serviceLabel = this.serviceCount = this.rails = this.leftbutton = this.listContainer = this.testlist = this.rightbutton = null;
			}
		},

		postCreate: function(){
			var railsBox = lib.bounds( this.node.parentNode );
			this.addData( this.serviceData );
			this.serviceLabel.textContent = messages['Services'];
			this.serviceCount.textContent = this.serviceData.length;
			this.node.style.width = (railsBox.width - 63) + 'px' ; //$NON-NLS-0$
		},
		
		show: function(){
			this.createElements();
		},

		expand: function() {
			this.rails.classList.remove( "serviceRailsHidden" ); //$NON-NLS-0$
			this.rails.classList.add( "serviceRailsVisible" ); //$NON-NLS-0$
			this.serviceLabel.classList.remove( "serviceContainerClosed" ); //$NON-NLS-0$
			this.serviceLabel.classList.add( "serviceContainerOpen" ); //$NON-NLS-0$
			this.serviceState = true; 
		},
		
		collapse: function(){
			this.serviceLabel.classList.remove( "serviceContainerOpen" ); //$NON-NLS-0$
			this.serviceLabel.classList.add( "serviceContainerClosed" ); //$NON-NLS-0$
			this.rails.classList.remove( "serviceRailsVisible" ); //$NON-NLS-0$
			this.rails.classList.add( "serviceRailsHidden" ); //$NON-NLS-0$
			this.serviceState = false; 
		},
		
		showServices: function(){
			if( this.serviceState === false ){

				this.expand();
				
				if( this.box ){
					lib.bounds( this.rails, this.box );
				}else{
					this.box = lib.bounds( this.rails );
				}
				
			}else{
				lib.bounds( this.rails, { height:0 } );
				this.collapse();
			}
		},
		
		onServiceClick: function(evt){
			if( evt.keyCode === lib.KEY.ENTER || evt.charCode === lib.KEY.SPACE ) {
				this.showServices();
				if( this.serviceState === false ){
					evt.target.setAttribute("aria-pressed", "true"); //$NON-NLS-1$ //$NON-NLS-0$
				}else{
					evt.target.setAttribute("aria-pressed", "false"); //$NON-NLS-1$ //$NON-NLS-0$
				}
				evt.preventDefault();
			}
		},
		
		showButtons: function(){
			
			
			if(	this.serviceData.length > 1 && this.pointer > 0 ){
				this.leftbutton.style.visibility = "visible" ; //$NON-NLS-0$
			}else{
				this.leftbutton.style.visibility = "hidden" ; //$NON-NLS-0$
			}
			
			if( this.serviceData.length > 1 && this.pointer < this.serviceData.length -1 ){
				this.rightbutton.style.visibility = "visible" ; //$NON-NLS-0$
			}else{
				this.rightbutton.style.visibility = "hidden" ; //$NON-NLS-0$
			}

			var sze = lib.bounds( this.rails );
	
			var buttonSize = lib.bounds( this.leftbutton.firstChild );
			var buttonTop = Math.round(sze.height/2) - Math.round( buttonSize.height ) + 'px'; //$NON-NLS-0$
			
			this.leftbutton.firstChild.style.top = buttonTop ;
			this.rightbutton.firstChild.style.top = buttonTop ;
			
		},
		
		hideButtons:function(){
			this.leftbutton.style.visibility = "hidden" ; //$NON-NLS-0$
			this.rightbutton.style.visibility = "hidden" ; //$NON-NLS-0$
		},
		
		slideRight: function(){

			this.box = lib.bounds( this.rails );
		
			if( this.pointer < this.serviceData.length -1 ){
		
				this.pointer = this.pointer+1;
		
				for( var count=0; count < this.pointer; count++ ){
					this.listContainer.childNodes[0].childNodes[count].style.display = "none" ; //$NON-NLS-1$ //$NON-NLS-0$
				};
			
				setBounds( this.rails, this.box );
			}
			
			this.showButtons();
		},
		
		slideLeft: function(){
		
			this.box = lib.bounds( this.rails );
		
			if( this.pointer > 0 ){
				this.pointer = this.pointer-1;
				this.listContainer.childNodes[0].childNodes[this.pointer].style.display = "" ; //$NON-NLS-0$
			}
			
			this.showButtons();
			
			setBounds( this.rails, this.box );
		},
		
		consoleOutput: function( debugData ){
			console.log( 'Service: ' + debugData.title + ' Element: ' +  debugData.item + ':'  ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			console.dir( debugData.value );
		},
		
		createServiceTable: function(data, location){

			var listItem = document.createElement("li"); //$NON-NLS-0$
			listItem.classList.add("serviceData"); //$NON-NLS-0$
			location.appendChild(listItem);

			var entry = document.createElement("div"); //$NON-NLS-0$
			entry.classList.add("listEntry"); //$NON-NLS-0$
			listItem.appendChild(entry);

			var tableContainer = document.createElement("div"); //$NON-NLS-0$
			tableContainer.classList.add("tablecontainer"); //$NON-NLS-0$
			entry.appendChild(tableContainer);

			var table = document.createElement("table"); //$NON-NLS-0$
			tableContainer.classList.add("serviceTable"); //$NON-NLS-0$
			tableContainer.appendChild(table);

			table.innerHTML = '<thead><tr><th scope="col">${Item}</th><th scope="col">${Value}</th></tr></thead>'; //$NON-NLS-0$
			lib.processTextNodes(table, messages);
			var tablebody = document.createElement( "tbody" ); //$NON-NLS-0$
			table.appendChild(tablebody);

			var itemCount;
			for( itemCount=0;itemCount<data.items.length;itemCount++ ){
				var row = document.createElement("tr"); //$NON-NLS-0$
				var td = document.createElement("td"); //$NON-NLS-0$
				td.textContent = data.items[itemCount].item;
				row.appendChild(td);
				tablebody.appendChild(row);
				
				var value = data.items[itemCount].value;
				
				var cell = document.createElement("td"); //$NON-NLS-0$
				row.appendChild(cell);
				
				if( typeof value === 'object' ){ //$NON-NLS-0$
				
					var debugData = { title:data.service, item:data.items[itemCount].item, value: value };

					var span = document.createElement("span"); //$NON-NLS-0$
					span.classList.add("objectLink");  //$NON-NLS-0$
					span.title = messages['CheckJsConsoleDrillDown'];
					span.addEventListener("click", this.consoleOutput.bind(this, debugData)); //$NON-NLS-0$
					span.textContent = messages['JavaScript Object'];
					cell.appendChild(span);
				}else{
					cell.textContent = value;
				}
			}
			
			var div = document.createElement("div"); //$NON-NLS-0$
			div.classList.add("listTitle"); //$NON-NLS-0$
			div.textContent = data.service;
			entry.appendChild(div);
		},
          
		addData: function(services){

			var itemCount;

			for( itemCount=0;itemCount<services.length;itemCount++ ){
				this.createServiceTable( services[itemCount], this.testlist );
			}
		},
		
		handleKeypress: function(evt) {
			if( evt.keyCode === lib.KEY.LEFT && this.leftbutton.style.visibility !== "hidden" ) { //$NON-NLS-0$
				this.slideLeft();
			}
			else if( evt.keyCode === lib.KEY.RIGHT && this.rightbutton.style.visibility !== "hidden" ) { //$NON-NLS-0$
				this.slideRight();
			}
		}
	});
	return ServiceCarousel;
});