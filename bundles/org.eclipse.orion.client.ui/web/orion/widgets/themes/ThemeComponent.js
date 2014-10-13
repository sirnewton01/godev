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

define([], 
	function() {


		function Component(){

		}
		
		Component.prototype.type = null;
		Component.prototype.fill = null;
		Component.prototype.stroke = null;
		Component.prototype.width = 0;
		Component.prototype.height = 0;
		Component.prototype.font = null;
		Component.prototype.text = null;
		Component.prototype.radius = null;
		Component.prototype.x = 0;
		Component.prototype.y = 0;
		Component.prototype.x2 = 0;
		Component.prototype.y2 = 0;
		Component.prototype.x3 = 0;
		Component.prototype.y3 = 0;
		Component.prototype.context = null;
		Component.prototype.description = null;
		Component.prototype.over = false;
		Component.prototype.family = null;
		
		function render( context ){
				
				if( context ){
					this.context = context;
				}
				
				switch( this.type ){
					
					case 'TEXT':
						
						this.context.beginPath();
						this.context.font = this.font;
					    this.context.fillStyle = this.fill;
					    this.context.fillText(this.text, this.x + 0.5, this.y + 0.5 );
					    this.context.closePath();
						break;
					
					case 'LINE':
			
						this.context.beginPath();
						this.context.strokeStyle = this.stroke;
						this.context.moveTo( this.x + 0.5, this.y + 0.5 );
						this.context.lineTo( this.x2 + 0.5, this.y2 + 0.5 );
						this.context.lineWidth = this.width;
						this.context.stroke();
						this.context.closePath();
						break;
				
					case 'RECTANGLE':
						this.context.beginPath();
						this.context.strokeStyle = this.stroke;
						if( this.fill ){ this.context.fillStyle = this.fill; }
						this.context.rect( this.x + 0.5, this.y + 0.5, this.width, this.height );
						if( this.fill ){ this.context.fill(); }  
						if( this.stroke ){ this.context.stroke(); }
						this.context.closePath();
						break;
			
			
					case 'ROUNDRECTANGLE':
						this.context.beginPath();
						this.context.fillStyle = this.fill;
						this.context.strokeStyle = this.stroke;
						this.context.moveTo(this.x + this.radius, this.y);
						this.context.lineTo(this.x + this.width - this.radius, this.y);
						this.context.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.radius);
						this.context.lineTo(this.x + this.width, this.y + this.height - this.radius);
						this.context.quadraticCurveTo( this.x + this.width, this.y + this.height, this.x + this.width - this.radius, this.y + this.height);
						this.context.lineTo(this.x + this.radius, this.y + this.height);
						this.context.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - this.radius);
						this.context.lineTo(this.x, this.y + this.radius);
						this.context.quadraticCurveTo(this.x, this.y, this.x + this.radius, this.y);
						this.context.closePath();
					  
						if( this.stroke ){ this.context.stroke(); }
						if( this.fill ){ this.context.fill(); }   
						break;
						
					case 'TRIANGLE':
						this.context.beginPath();
						this.context.moveTo( this.x + 0.5, this.y + 0.5 );
						this.context.lineTo( this.x2 + 0.5, this.y2 + 0.5 );
						this.context.lineTo( this.x3 + 0.5, this.y3 + 0.5 );
						this.context.lineTo( this.x + 0.5, this.y + 0.5 );
						this.context.fillStyle = this.fill;
						this.context.fill();
						this.context.closePath();
						break;
						
					case 'ELLIPSE':	
					
						this.context.beginPath();
						this.context.arc( this.x + 0.5, this.y + 0.5, this.radius, this.startangle, this.endangle, this.direction );
						this.context.fillStyle = this.fill;
						this.context.fill();
						this.context.closePath();
						break;
				}
		}

Component.prototype.render = render;
			
		function mouseOver( mouseX, mouseY ){
			this.over = false;
		    
			switch( this.type ){
				case 'RECTANGLE':
				case 'ROUNDRECTANGLE':
					if( mouseX > this.x && mouseX < ( this.x + this.width ) ){
						if( mouseY > this.y && mouseY < ( this.y + this.height ) ){
							this.over = true;
						}
					}
		
					break;
					
				case 'TEXT':
					if( mouseX > this.x && mouseX < ( this.x + this.width ) ){
						if( mouseY > this.y - 16 && mouseY < ( this.y -16 + this.height ) ){
							this.over = true;
						}
					}
					break;
					
				case 'ELLIPSE':
				
					if( mouseX > this.x -5 - this.radius  && mouseX < ( this.x -5 + this.radius ) ){
						if( mouseY > this.y -5 - this.radius && mouseY < ( this.y -5 + this.radius ) ){
							this.over = true;
						}
					}
				
					break;
					
				case 'LINE':
					break;
			}
		
			return this.over;
		}
		
		Component.prototype.mouseOver = mouseOver;

		
		function roundRect(context, x, y, width, height, radius, fill, stroke) {   
			var subject = new Component();
			subject.type = 'ROUNDRECTANGLE';
		    subject.fill = fill;
		    subject.stroke = stroke;
		    subject.x = x;
		    subject.y = y;
		    subject.width = width;
		    subject.height = height;
			subject.radius = radius;
		    subject.render(context);
		    return subject;
		}
		
		function drawTriangle( context, x, y, x2, y2, x3, y3, fill, stroke ){
			var subject = new Component();
		    subject.type = 'TRIANGLE';
		    subject.fill = fill;
		    subject.stroke = stroke;
		    subject.x = x;
		    subject.y = y;
		    subject.x2 = x2;
		    subject.y2 = y2;
		    subject.x3 = x3;
		    subject.y3 = y3;
		    subject.render(context);
		    return subject;
		}
		
		function drawRectangle( context, x, y, width, height, fill, stroke ){
			var subject = new Component();
		    subject.type = 'RECTANGLE';
		    subject.fill = fill;
		    subject.stroke = stroke;
		    subject.x = x;
		    subject.y = y;
		    subject.width = width;
		    subject.height = height;
		    subject.render(context);
		    return subject;
		}
		
		function drawText( context, text, x, y, style, color ){
			var subject = new Component();
		    subject.type = 'TEXT';
		    subject.font = style;
		    subject.fill = color;
		    subject.text = text;
		    subject.x = x;
		    subject.y = y;
		    subject.render(context);
		    subject.width = context.measureText( text ).width;
		    subject.height = 15;
		    return subject;
		}
		
		function drawLine( context, x1, y1, x2, y2, width, color ){
			var line = new Component();
		    line.type= 'LINE';
		    line.stroke = color;
		    line.width = width;
		    line.x = x1;
		    line.y = y1;
		    line.x2 = x2;
		    line.y2 = y2;
		    line.render(context);
		    return line;
		}
		
		
		function drawArc( context, x, y, radius, startAngle, endAngle, direction, width, color ){
			var arc = new Component();
		    arc.type= 'ELLIPSE';
		    arc.fill = color;
		    arc.width = width;
		    arc.x = x;
		    arc.y = y;
		    arc.radius = radius;
		    arc.startangle = startAngle;
		    arc.endangle = endAngle;
		    arc.direction = direction;
		    arc.render(context);
		    return arc;
		}
		
		function glow( width, top ){

			var padding = 6;
			
			var originy = Math.floor( this.y-padding + (this.height + (2*padding) )/2 );
			
			switch( this.type ){
				case 'RECTANGLE':
				case 'ROUNDRECTANGLE':
					break;
					
				case 'TEXT':
				
					originy = originy -8;
					break;
			}
			
			var originx = this.x-padding + ( this.width + (2*padding) ) * 0.5;
			
			this.context.beginPath();
			this.context.moveTo( originx + 0.5, originy + 0.5 );
			this.context.lineTo( width + 30 + 0.5, originy + 0.5 );
			this.context.lineTo( width + 30 + 0.5, top + 7 + 0.5 );
			this.context.lineTo( width + 45 + 0.5, top + 7 + 0.5 );
			this.context.strokeStyle = '#cc0000';
			this.context.lineWidth = 1;
			this.context.stroke();
			
			drawArc( this.context, originx, originy, 3, 0, 2 * Math.PI, false, null, '#cc0000' );
			
			this.context.closePath();

		}	
		
		
		Component.prototype.glow = glow;
		

		return{
			Component:Component,
			drawArc:drawArc,
			drawLine:drawLine,
			drawText:drawText,
			drawRectangle:drawRectangle,
			drawTriangle:drawTriangle,
			roundRect:roundRect
		};

	}
);
