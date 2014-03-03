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
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['orion/webui/littlelib'], function(lib) {
	
		function UATaskPanel( anchor, modal, elementData ){
			this.elements = elementData;

			this.taskPanel = document.createElement( 'div' );
			this.taskPanel.className = "UAContainer";
			this.taskPanel.innerHTML = '<header class="UAHeader">Develop software from within the cloud</header>';
							
			this.elementNode = document.createElement( 'div' );
			this.switchesContainer = document.createElement( 'div' );
			this.switches = document.createElement( 'span' );
			
			this.radioButtons = [];
			
			this.elementNode.className = "UAContainer-body";
			
			this.taskPanel.appendChild( this.elementNode );
			
			this.switchesContainer.className = "UAContainer-switch-body";	
			this.switches.className = "UAContainer-switches";
			this.switchesContainer.innerHTML = "";
			this.switchesContainer.appendChild( this.switches );
			this.taskPanel.appendChild( this.switchesContainer );
			
			if( modal === true ){			
				this.container = document.createElement( 'div' );
				this.container.className = 'UAModal';
				this.container.appendChild( this.taskPanel );
				this.backdrop = document.createElement( 'div' );
				this.backdrop.className = 'UAModalBackground';
				document.body.appendChild( this.backdrop );
				document.body.appendChild( this.container );
				lib.addAutoDismiss([this.container], this.destroy.bind(this));
			}else{
				anchor.appendChild( this.taskPanel );
			}		

			this.chosenSwitch = this.createSwitch( null, true );			
			this.chosenSwitch.firstChild.className = "chosenCircle";
			this.initialize();	

			this.elements.forEach( this.createSwitch.bind(this) );
		}

		UATaskPanel.prototype.elementNode = null;
		UATaskPanel.prototype.switchesContainer = null;
		UATaskPanel.prototype.switches = null;
		UATaskPanel.prototype.radioButtons = null;
		UATaskPanel.prototype.chosenSwitch = null;
		
							
		UATaskPanel.prototype.addElement = function( elementData ){
			
			var element = document.createElement( 'span' );
			element.className = "UAContainer-icon";
			
			element.innerHTML = '<span class="workingSpan">' +
									'<img src="' + elementData.image + '" id="' + elementData.label + 'ImageNode' + '" alt="' + elementData.alt + '" height="64" width="64">' +
								'</span>' +
								'<span class="UAIcon-label">' +
									'<span class="UALabel" id="' + elementData.label + 'LabelNode" >' + elementData.label + '</span>' +
								'</span>';
							
			element.onmouseover = function(){
				var learn = document.getElementById( elementData.label + 'ImageNode' );
				learn.src = elementData.secondaryImage;
				var labelNode = document.getElementById( elementData.label + 'LabelNode' );
				labelNode.className = "UALabel-live";
				element.className = "UAContainer-icon-live";
			};
			
			element.onmouseout = function(){
				var learn = document.getElementById( elementData.label + 'ImageNode' );
				learn.src = elementData.image;
				var labelNode = document.getElementById( elementData.label + 'LabelNode' );
				labelNode.className = "UALabel";
				element.className = "UAContainer-icon";
			};
			
			var owner = this;
			
			element.onclick = function(){
				owner.showMedia( elementData );
			};
							
			this.elementNode.appendChild( element );
		};
		
		UATaskPanel.prototype.clearElements = function(){
			this.elementNode.innerHTML = "";
		};
		
		UATaskPanel.prototype.showMedia = function( elementData ){
			
			this.clearElements();
			
			this.addElement( elementData );
			
			var clip = document.createElement( 'span' );
			clip.className = "UAContainer-media";
			
			clip.innerHTML = '<div></div><div></div><span class="mediaSpan"><img src="' + elementData.media + '" alt="'+ elementData.alt + '" height="300" width="400"></span>';
			
			this.elementNode.appendChild( clip );
			
			setTimeout(function(){clip.style.opacity = 1;},100);
			
			var radioButton = document.getElementById( elementData.label + 'switch' );
			
			this.chosenSwitch.firstChild.className = "circle";
			this.chosenSwitch = radioButton.parentNode;
			radioButton.className = "chosenCircle";
		};
		
		UATaskPanel.prototype.createSwitch = function( elementData ){
			
			var radioButtonName;
			
			if( elementData ){
				radioButtonName = elementData.label + 'switch';
			}else{
				radioButtonName = 'indexSwitch';
			}

			var radioButton = document.createElement( 'span' );
			radioButton.className = "workingSpan";
			radioButton.innerHTML = '<div class="circle" id ="' + radioButtonName + '"></div>';

			var owner = this;
			
			/* A switch can show the 'index' of the items we can see videos about, or
			   it can be a switch to see a specific video - so we need to handle the cases
			   a little differently ... */
			
			if( elementData ){
				
				/* For a video case */
				
				radioButton.onclick = function(){
					owner.showMedia( elementData );
				};
			}else{
				
				/* For the index case */
				
				radioButton.onclick = function(){
					owner.initialize();
					owner.chosenSwitch.firstChild.className = "circle";
					owner.chosenSwitch = radioButton;
					owner.chosenSwitch.firstChild.className = "chosenCircle";
				};
			}
			
			this.switches.appendChild( radioButton );
			this.radioButtons[ this.radioButtons.length ] = radioButton;		
			
			return radioButton;	
		};
		
		UATaskPanel.prototype.initialize = function(){
			this.clearElements();
			this.elements.forEach( this.addElement.bind(this) );
		};
		
		UATaskPanel.prototype.destroy = function(){
			document.body.removeChild( this.backdrop );
			document.body.removeChild( this.container );
		};
	
		return UATaskPanel;
 } );