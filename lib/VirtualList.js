/**
 * Author: 	Patrick Derichs
 * Date:	10/30/2011
 * Version:	0.07
 * License: GPL (http://www.gnu.org/licenses/gpl.html) -or- MIT (http://www.opensource.org/licenses/mit-license.php)
 * EMail:	patrick.derichs@gmx.de
 * 
 * That is a simple list control for Sencha Touch environments to support many items.
 * There are some features missing for the first version (e.g. grouping) to ease the main
 * handling.
 * 
 * The code is partly based on Ext.ux.BufferedList (especially index/group handling)
 * implemented by Scott Borduin and the community in Sencha Touch forum (see 
 * https://github.com/Lioarlan/UxBufList-Sench-Touch-Extension for details).
 * 
 */

Ext.ux.VirtualList = Ext.extend(Ext.List, {
	
	// The height of one item. This should be equal to
	// the height of CSS style definition of the items.
	defaultItemHeight: 65,
	
	// Task for container rendering
	renderTask: null,
	
	// How many items should one container contain?
	// This value * 3 is the effective item count
	// rendered to the list.
	containerMaxItemCount: 100,
	
	// List of used containers
	containerList: null,
	
	// Indicates a current scroll operation - no refresh
	// should be done while the control is scrolling.
	//scrolling: false,
	
	// The item index of the top rendered item 
	topRenderedIndex: -1,
	
	// The item index of the bottom rendered item
	bottomRenderedIndex: -1,
	
	//--------------------------------------------------------------------------------------------
	// override
	initComponent: function() {
		
        this.containerList = new Array();
		
        var templ = '<div class="x-list-item"><div class="x-list-item-body">' +
            this.itemTpl + '</div>';
        if (this.onItemDisclosure) {
            templ += '<div class="x-list-disclosure"></div>';
        }
        templ += '</div>';
		this.itemTplDelayed = new Ext.XTemplate(templ).compile();
	
		Ext.ux.VirtualList.superclass.initComponent.call(this);
		
		// new template which will only be used for our proxies
		this.tpl = new Ext.XTemplate([
			'<tpl for=".">',
				'<div class="{id}"></div>',
			'</tpl>'
		]);
		
		this.renderTask = new Ext.util.DelayedTask(function() {
			this.updateViewByCurrentScrollPos();
		}, this);
	
		this.addEvents(
	             /**
	              * @event renderedAreaChanged
	              * Fires when the area of rendered items was changed
	              * @param {int} topIndex of the new rendered area
	              * @param {int} bottomIndex of the new rendered area
	              */
	             'renderedAreaChanged'
		);
		
	},	
	
	//--------------------------------------------------------------------------------------------
	// This method returns the container information list.
	collectData: function(records, startIndex) {
		
		var count = this.store.getCount();
		if(count <= 0)
			return [];
		
		var res = [],
			containerCount = Math.floor( count / this.containerMaxItemCount),
			lastContainerItemCount = count % this.containerMaxItemCount,
			topIdx = 0,
			bottomIdx,
			contItem;
		
		this.containerList.splice(0); // clear
		
		if(lastContainerItemCount > 0)
			containerCount++;
		
		for(var i = 0; i < containerCount; i++) {
			if ( (lastContainerItemCount > 0) && (i == (containerCount - 1)) )
				bottomIdx = topIdx + lastContainerItemCount;
			else
				bottomIdx = topIdx + this.containerMaxItemCount - 1;
			
			contItem = {
				id: 'itemContainer_' + i,
				index: i,
				topItemIndex: topIdx,
				bottomItemIndex: bottomIdx,
				itemCount: bottomIdx - topIdx + 1,
				containerHeight: 0,
				rendered: false
			};
			
			topIdx += contItem.itemCount;
			
			contItem.containerHeight = contItem.itemCount * this.defaultItemHeight;
			
			res.push(contItem);
			this.containerList.push(contItem);
		}
		
		return res;
	},

	//--------------------------------------------------------------------------------------------
	// 	Returns the DOM Element of the given container.
	getDomElementByContainer: function(container) {
		return this.getTargetEl().down('.' + container.id);
	},
	
	//--------------------------------------------------------------------------------------------
	// @private - override so we can remove base class scroll event handlers
	initEvents: function() {
		
		Ext.ux.VirtualList.superclass.initEvents.call(this);
		
		// Remove listeners added by base class, these are all overridden
		// in this implementation.
        this.mun(this.scroller, {
            scrollstart: this.onScrollStart,
            scroll: this.onScroll,
            scope: this
        });

	},
	
	//--------------------------------------------------------------------------------------------
	// Returns the item index of the current top rendered item in list
	//
	getTopRenderedItemIndex: function() {
		return this.topRenderedIndex;
	},
	
	//--------------------------------------------------------------------------------------------
	// Returns the item index of the current bottom rendered item in list
	//
	getBottomRenderedItemIndex: function() {
		return this.bottomRenderedIndex;
	},

	//--------------------------------------------------------------------------------------------
	// Builds HTML to add to a list container.
	// Note: Group headers are disabled for this version.
	// @private
	buildItemHtml: function(firstItem,lastItem) {
		// loop over records, building up html string
		var i, 
			htm = '',
			store = this.store,
			tpl = this.itemTplDelayed,
//			grpHeads = this.useGroupHeaders,
			record,
			groupId; 
		for ( i = firstItem; i <= lastItem; i++ ) {
			record = store.getAt(i);
			if(!Ext.isObject(record))
				break;
//			if ( grpHeads ) {
//				groupId = store.getGroupString(record);
//				if ( i === this.groupStartIndex(groupId) ) {
//					htm += ('<h3 class="x-list-header">' + groupId.toUpperCase() + '</h3>');
//				}
//			}
			htm += tpl.applyTemplate(record.data);
		}
		return htm;
	},
	
	//--------------------------------------------------------------------------------------------
	// Renders the contents of the given item container. The el parameter is optional. 
	renderItemContainer: function(container, el) {
		
		var count = this.store.getCount(),
			start,
			end;
		
		if(count > 0) {
			
			// Start index
			start = container.topItemIndex;
			
			// End index
			end = container.bottomItemIndex;
			
			// Update HTML
			var elem;
			if(el !== undefined)
				elem = el;
			else
				elem = this.getDomElementByContainer(container);
			var htm = this.buildItemHtml(start, end);
			elem.update(htm);
			
			container.rendered = true;
			
			this.updateViewIndices(container);
		}
	},
	
	//--------------------------------------------------------------------------------------------
	// The refresh method is called everytime the store is updated.
	refresh: function() {
//		if(this.scrolling)
//			return;
			
		Ext.ux.VirtualList.superclass.refresh.apply(this, arguments);
		
		// Used for index bar
		this.initGroupIndexMap();
		
		// Render needed containers by current scroll position
		this.updateViewByCurrentScrollPos();
	},
	
	//--------------------------------------------------------------------------------------------
	// This function returns the container which contains the given item index.
	getContainerByItemIndex: function(itemIdx) {		
		var item;
		for(var i = 0; i < this.containerList.length; i++) {
			item = this.containerList[i];
			if(itemIdx >= item.topItemIndex &&
					itemIdx <= item.bottomItemIndex)
				return item;
		}
		return null;
	},
	
	//--------------------------------------------------------------------------------------------
	// This method takes an array of container indices which needs to be rendered and renders
	// their contents.
	renderContainers: function(contList) {
		
		var cItem,
			elem,
			oldTop = this.topRenderedIndex,
			oldBott = this.bottomRenderedIndex;
		
		this.topRenderedIndex = -1;
		this.bottomRenderedIndex = -1;
		
		for(var i = 0; i < this.containerList.length; i++) {
			cItem = this.containerList[i];
			
			elem = this.getDomElementByContainer(cItem);
            if(Ext.isObject(elem)) {
			    // Update container contents
			    if(contList.indexOf(cItem.index) >= 0) {
				    if(!cItem.rendered) {
					    // Render it!
					    this.renderItemContainer(cItem, elem);
					    cItem.rendered = true;
				    }
			    } else  {
				    if(cItem.rendered) {
					    // Clear container contents:
					    // Get DOM element by id
					    elem.update(''); // clear its contents
					    cItem.rendered = false;
				    }
			    }
			
			    // Update Container height
			    elem.setHeight(cItem.containerHeight);
			
			    // Update rendered area indices
			    if(cItem.rendered) {
				    if(this.topRenderedIndex == -1 || cItem.topItemIndex < this.topRenderedIndex)
					    this.topRenderedIndex = cItem.topItemIndex;
				    if(this.bottomRenderedIndex == -1 || cItem.bottomItemIndex > this.bottomRenderedIndex)
					    this.bottomRenderedIndex = cItem.bottomItemIndex;
			    }
            }
		}
		
		// Fire event if area changed
		if( (this.topRenderedIndex != oldTop) ||
				(this.bottomRenderedIndex != oldBott) ) {
			this.fireEvent('renderedAreaChanged',
					this.topRenderedIndex, this.bottomRenderedIndex);
		}
				
	},
	
	//--------------------------------------------------------------------------------------------
	// This method takes care to render the containers regarding the given scroll position.
	showItemContainer: function(scrollPos) {
		var itemIdx = scrollPos / this.defaultItemHeight;
		
		var container = this.getContainerByItemIndex(itemIdx),
			prevCont,
			nextCont;
		
        if(!Ext.isObject(container)) {
            if(this.containerList.length <= 0)
                return;

            // As a fallback switch to first container
            container = this.containerList[0];
            this.scroller.scrollTo( {x: 0, y: 0} );
        }

		var idx = container.index;
			
		// Set prev container index
		var prevContainerIdx = idx - 1;
		if(prevContainerIdx < 0)
			prevCont = -1;
		else
			prevCont = prevContainerIdx;
			
		// Set next container index
		var nextContainerIdx = idx + 1;
		if(nextContainerIdx >= this.containerList.length)
			nextCont = -1;
		else
			nextCont = nextContainerIdx;
			
		// Render new container list
		this.renderContainers([prevCont, idx, nextCont]);
	},
	
	//--------------------------------------------------------------------------------------------
	// Updates the view by using the current scroller position
	updateViewByCurrentScrollPos: function() {
		var y = this.scroller.getOffset().y;
		this.showItemContainer(y);
	},
	
	//--------------------------------------------------------------------------------------------
	// (future use?)
	onScrollEvent: function() {
		// Indicate starting scroll process.
		//this.scrolling = true;
	},
	
	//--------------------------------------------------------------------------------------------
	// 
	onScrollStop: function() {
		//console.log('* EVENT: onScrollStop');
		
		// Scroll process done.
		//this.scrolling = false;
		
		// prevents the list from selecting an item if the user just taps to stop the scroll
		if ( this.blockScrollSelect ) {
			this.selModel.setLocked(true);
			Ext.defer(this.unblockSelect,100,this);
		}
		
		// Update contents.
		this.renderTask.delay(100);
	},
	
	//--------------------------------------------------------------------------------------------
	// @private - create a map of grouping strings to start index of the groups
	initGroupIndexMap: function() {
		this.groupIndexMap = {};

        if(!this.grouped)
            return;

		var i, 
			key,
			firstKey,
			store = this.store, 
			recmap = {},
			groupMap = this.groupIndexMap,
			prevGroup = '',
			sc = store.getCount();

		// build temporary map of group string to store index from store records
		for ( i = 0; i < sc; i++ ) {
            key = escape(store.getGroupString(store.getAt(i)).toLowerCase());
			if ( recmap[key] === undefined ) {
				recmap[key] = { index: i, closest: key, prev: prevGroup } ;
				prevGroup = key;
			}
			if ( !firstKey ) {
				firstKey = key;
			}
		}

		// now make sure our saved map has entries for every index string
		// in our index bar, if we have a bar.
        if (!!this.indexBar) {
			var barStore = this.indexBar.store, 
				bc = barStore.getCount(), 
				grpid, 
				idx = 0,
				recobj;
				prevGroup = '',
				key = '';
        	for ( i = 0; i < bc; i++ ) {
				grpid = barStore.getAt(i).get('key').toLowerCase();
				recobj = recmap[grpid];
				if ( recobj ) {
					idx = recobj.index;
					key = recobj.closest;
					prevGroup = recobj.prev;
				}
				else if ( !key ) {
					key = firstKey;
				}
				groupMap[grpid] = { index: idx, closest: key, prev: prevGroup };
			}
        }
        else {
            this.groupIndexMap = recmap;
        }		
	},
	
	//--------------------------------------------------------------------------------------------
	// Used by onScrollStop
	unblockSelect: function() {
		this.selModel.setLocked(false);
	},
	
	
	//--------------------------------------------------------------------------------------------
	// This is where our scroller events are set up
	afterRender: function() {
		Ext.ux.VirtualList.superclass.afterRender.apply(this,arguments);
		
		// set up listeners which will trigger rendering/cleanup of our sliding window of items
		this.mon(this.scroller,{
			scroll: this.onScrollEvent,
			scrollend: this.onScrollStop,
			scope: this
		});
	},
	
	//--------------------------------------------------------------------------------------------
	// @private - get an encoded version of the string for use as a key in the hash 
    getKeyFromId: function (groupId){
        return escape(groupId.toLowerCase());
    },
    
    //-------------------------------------------------------------------------------------------- 
    // @private - get the group object corresponding to the given id
    getGroupObj:function (groupId){
        return this.groupIndexMap[this.getKeyFromId(groupId)];
    },
    
    //--------------------------------------------------------------------------------------------
    // @private - get starting index of a group by group string
    groupStartIndex: function(groupId) {
        return this.getGroupObj(groupId).index;
    },

    //--------------------------------------------------------------------------------------------
    // This is important for item selection
    updateViewIndices: function(container) {
		var index = container.topItemIndex;
		var el = this.getDomElementByContainer(container);
		
		var node = el.dom.firstChild;
		while ( node ) {
			var tagName = node.tagName;
			if ( tagName === 'DIV') {
				node.viewIndex = index++;
				//this.all.elements.push(newNode);
			}
//			else if ( tagName === 'H3') {
//				this.groupHeaders.push(newNode);
//			}
			node = node.nextSibling;
		}
	},
	
    //--------------------------------------------------------------------------------------------
    // @private - respond to indexBar touch.
	onIndex: function(record, target, index) {
		// get first item of group from map
		var grpId = record.get('key').toLowerCase();
		//console.log('onIndex: ' + grpId);
		var firstItem = this.groupStartIndex(grpId);

		// render new list of items into list container
		if ( Ext.isNumber(firstItem) ) {		
			var scrollPos = firstItem * this.defaultItemHeight;

			// scroll list container into view. Temporarily suspend scroll events
			// so as not to invoke another call to renderOnScroll. Must update
			// scroller boundary to make sure scroll position in bounds.
			this.scroller.updateBoundary();
			this.scroller.suspendEvents();
			this.scroller.scrollTo({x: 0, y: scrollPos }, false);
			this.scroller.resumeEvents();
			
			// Update view accordingly
			//this.renderTask.delay(100);
			this.updateViewByCurrentScrollPos();
		}
	},

	//--------------------------------------------------------------------------------------------
	// We need a special handling here, since node can be null.
	onItemSelect: function(record) {
        var node = this.getNode(record);
        if(node) {
        	Ext.fly(node).addCls(this.selectedItemCls);
        }
    },

    //--------------------------------------------------------------------------------------------
	// We need a special handling here, since node can be null.
    onItemDeselect: function(record) {
        var node = this.getNode(record);
        if(node) {
        	Ext.fly(node).removeCls(this.selectedItemCls);
        }
    }
    
});