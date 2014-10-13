/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['require', 'orion/webui/littlelib'], function (require, lib) {

    /**
     * Constructs a new BreadCrumb with the given options.
     * @param {Object} options The options object, which must specify the parent container.
     * @param options.container The parent container for the bread crumb presentation
     * @param [options.resource] The current resource
     * @param [options.rootSegmentName] The name to use for the root segment in lieu of the metadata name.
     * @param [options.workspaceRootSegmentName] The name to use for the workspace root. If not specified, the workspace root
     * will not be shown.
     * @param {Function} [options.makeHref] The callback function to make the href on a bread crumb item. If not defined "/edit/edit.html#" is used.
     * @param {Function} [option.getFirstSegment] The callback function to make DOM node for the first segment in breadcrumb. 
     * @class Bread crumbs show the current position within a resource tree and allow navigation
     * to different places in the tree. Unlike the fairy tale, bread crumbs typically don't lead
     * to a cottage made of gingerbread. Sorry!
     * @name orion.breadcrumbs.BreadCrumbs
     */

    function BreadCrumbs(options) {
        this._init(options);
    }
    BreadCrumbs.prototype = /** @lends orion.breadcrumbs.BreadCrumbs.prototype */ {
        _init: function (options) {
            var container = lib.node(options.container);
            if (!container) {
                throw "no parent container"; //$NON-NLS-0$
            }
            this._container = container;
            container.classList.remove("currentLocation"); //$NON-NLS-0$
            this._id = options.id || "eclipse.breadcrumbs"; //$NON-NLS-0$
            this._resource = options.resource || null;
            this._rootSegmentName = options.rootSegmentName;
            this._workspaceRootSegmentName = options.workspaceRootSegmentName;
			this._workspaceRootURL = options.workspaceRootURL;
            this._makeHref = options.makeHref;
            this._makeFinalHref = options.makeFinalHref;
            this._maxLength = options.maxLength;
            this.path = "";
            this.render();
            
            this._resizeListener = this.fitSegments.bind(this);
            window.addEventListener("resize", this._resizeListener); //$NON-NLS-0$
        },

        getNavigatorWorkspaceRootSegment: function () {
            if (this._workspaceRootSegmentName) {
                var seg;
                if (this._resource && this._resource.Parents && !this._resource.skip) {
                    seg = document.createElement('a'); //$NON-NLS-0$
					var param = this._workspaceRootURL ? this._workspaceRootURL : "";
                    if (this._makeHref) {
                        this._makeHref(seg, param );
                    } else {
                        seg.href = require.toUrl("edit/edit.html") + "#" + param; //$NON-NLS-1$ //$NON-NLS-0$
                    }
                } else {
                    seg = document.createElement('span'); //$NON-NLS-0$
                }
                lib.empty(seg);
                seg.appendChild(document.createTextNode(this._workspaceRootSegmentName));
                return seg;
            }
            return null;
        },

        segments: [],

        buildSegment: function (name) {
            var segment = document.createElement('a'); //$NON-NLS-0$
            segment.classList.add("breadcrumb"); //$NON-NLS-0$
            segment.appendChild(document.createTextNode(name));
            return segment;
        },

        addSegmentHref: function (seg, section) {
            if (this._makeHref) {
                this._makeHref(seg, section.Location, section);
            } else {
                seg.href = require.toUrl("edit/edit.html") + "#" + section.ChildrenLocation; //$NON-NLS-1$ //$NON-NLS-0$
            }
        },

        buildSegments: function (firstSegmentName, direction) {
        	this.segments = [];
        	
			if( this._resource.Parents ){      
	            var parents = this._resource.Parents.slice(0); // create a copy
	            var seg;
	            var segmentName;
	            
	            if( parents ){
	
		            var collection = parents.slice(0);
		
		            if (direction === 'reverse') { //$NON-NLS-0$
		                collection = collection.reverse().slice(0);
		            }
		
		            collection.forEach(function (parent) {
						if(parent.skip) {
							return;
						}
		                if (firstSegmentName) {
		                    segmentName = firstSegmentName;
		                    firstSegmentName = null;
		                } else {
		                    segmentName = parent.Name;
		                }
		
		                seg = this.buildSegment(segmentName);
		                
		                this.path += parent.Name;
			            this.addSegmentHref(seg, parent);
		                
		                this.segments.push(seg);
		
		            }.bind(this));         
	            }
            }
        },

        addDivider: function () {
            var slash = document.createElement('span'); //$NON-NLS-0$
            slash.appendChild(document.createTextNode(' / ')); //$NON-NLS-0$
            this.path += "/"; //$NON-NLS-0$
            slash.classList.add("breadcrumbSeparator"); //$NON-NLS-0$		
            this.append(slash);
        },

        refresh: function () {
            this.crumbs = lib.node(this._id);

            if (this.crumbs) {
                lib.empty(this.crumbs);
            } else {
                this.crumbs = document.createElement("span"); //$NON-NLS-0$
                this.crumbs.id = this._id;
                this._container.appendChild(this.crumbs);

                this.dirty = document.createElement("span"); //$NON-NLS-0$
                this.dirty.id = "dirty"; //$NON-NLS-0$
                this.dirty.className = "modifiedFileMarker"; //$NON-NLS-0$
            }
            
            this.crumbs.classList.add("breadcrumbContainer"); //$NON-NLS-0$
            this.crumbs.style.visibility = "visible"; //$NON-NLS-0$
            this.crumbs.parentNode.className = "currentLocation"; //$NON-NLS-0$
            this.crumbs.parentNode.style.width = "100%"; //$NON-NLS-0$
        },

        append: function (section) {
            this.crumbs.appendChild(section);
        },

        addTitle: function (seg, firstSegmentName) {
            // if we had no resource, or had no parents, we need some kind of current location in the breadcrumb

			var text = firstSegmentName || document.title;

            if (this.crumbs.childNodes.length === 0) {
                seg = document.createElement('span'); //$NON-NLS-0$
                seg.appendChild(document.createTextNode( text ));
                seg.classList.add("breadcrumb"); //$NON-NLS-0$
                seg.classList.add("currentLocation"); //$NON-NLS-0$
                this._finalSegment = seg;
                this.append(seg);
            }
        },

        finalSegment: function (seg, firstSegmentName) {
        	if(this._resource.skip) {
        		return;
        	}
            var name;
            if (firstSegmentName) {
                name = firstSegmentName;
            } else {
				name = this._resource.Name;
            }
            if (this._makeFinalHref) {
               seg = this.buildSegment(name); //$NON-NLS-0$
               this.addSegmentHref(seg, this._resource);
            } else {
                seg = document.createElement("span"); //$NON-NLS-0$
                seg.appendChild(document.createTextNode( name ));
            }
            seg.classList.add("currentLocation"); //$NON-NLS-0$
            this.path += this._resource.Name;
            this.append(seg);
            
            this._finalSegment = seg;
            
    		this._finalSegment.style.flexShrink = "0"; //$NON-NLS-0$
    		if (undefined !== this._finalSegment.style.webkitFlexShrink) {
    			this._finalSegment.style.webkitFlexShrink = "0"; //$NON-NLS-0$
    		}
    		
            // iterate through breadcrumb nodes and add flexShrink to them
            var children = this.crumbs.childNodes;
            for (var i = 0 ; i < (children.length - 1) ; i++) {
            	if (children[i].classList.contains("breadcrumb")) { //$NON-NLS-0$
            		var flexShrink = ((children.length - 1 - i) * 100);
            		// segments closer to root should shrink more than ones closer to current location
            		children[i].style.flexShrink = "" + flexShrink; //$NON-NLS-0$
            		if (undefined !== children[i].style.webkitFlexShrink) {
		    			children[i].style.webkitFlexShrink = "" + flexShrink; //$NON-NLS-0$
		    		}
            	}
            }
            
            this.crumbs.appendChild(this.dirty);
        },

        firstSegment: function (segment) {
            if (segment) {
                this.append(segment);
                
                if (this._resource && this._resource.Parents && !this._resource.skip) {
                    segment.classList.add("breadcrumb"); //$NON-NLS-0$
                    this.addDivider();
                } else { // we are at the root.  Get rid of any href since we are already here
                    if(!this._resource.skip) {
                    	segment.href = ""; //$NON-NLS-0$
                    }
                    segment.classList.add("currentLocation"); //$NON-NLS-0$
                    this._finalSegment = segment;
                    return;
                }
            }
        },

        drawSegments: function () {

            if (this._resource.Parents) {
                var reverseParents = this.segments.slice(0);
                reverseParents.forEach(function (parent) {
                	this.append(parent);
                	this.addDivider();
                }.bind(this));
            }
        },
        
        fitSegments: function () {
        	if (this.crumbs.parentNode) {
        		if (this._finalSegment) {
            		this._finalSegment.style.flexShrink = "0"; //$NON-NLS-0$
            		if (undefined !== this._finalSegment.style.webkitFlexShrink) {
		    			this._finalSegment.style.webkitFlexShrink = "0"; //$NON-NLS-0$
		    		}
            		
            		if (this.crumbs.offsetWidth < this.crumbs.scrollWidth) {
            			this._finalSegment.style.flexShrink = "1"; //$NON-NLS-0$
            			if (undefined !== this._finalSegment.style.webkitFlexShrink) {
            				this._finalSegment.style.webkitFlexShrink = "1"; //$NON-NLS-0$
            			}
            		}
            	}
        	} else {
        		// breadcrumb has been removed without destroy() being called, remove listener
        		window.removeEventListener("resize", this._resizeListener); //$NON-NLS-0$
        		this._resizeListener = null;
        	}
        },

        render: function () {

            this.refresh();

            var segment = this.getNavigatorWorkspaceRootSegment();

            var firstSegmentName = this._rootSegmentName;

            if (firstSegmentName) {
                this.addTitle(segment, firstSegmentName);
            } else {
            	this.firstSegment(segment);
                if (this._resource && this._resource.Parents) {
                	this.buildSegments(firstSegmentName, 'reverse'); //$NON-NLS-0$
                    this.drawSegments();
                    this.finalSegment(segment, firstSegmentName);
                    this.fitSegments();
                }
            }
        },
        
        destroy: function() {
        	if (this._resizeListener) {
        		window.removeEventListener("resize", this._resizeListener); //$NON-NLS-0$
        		this._resizeListener = null;
        	}
        	
        }
    };

    BreadCrumbs.prototype.constructor = BreadCrumbs;
    return {
        BreadCrumbs: BreadCrumbs
    };
});
