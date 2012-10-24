/*
 * Lightweight RTE - jQuery Plugin, version 1.2
 * Copyright (c) 2009 Andrey Gayvoronsky - http://www.gayvoronsky.com
 */
jQuery.fn.rte = function(options, editors) {
	if(!editors || editors.constructor != Array)
		editors = new Array();
		
	$(this).each(function(i) {
		var id = (this.id) ? this.id : editors.length;
		editors[id] = new lwRTE (this, options || {});
	});
	
	return editors;
}

var lwRTE_resizer = function(textarea, minWidth, maxWidth) {
	this.drag = false;
	this.rte_zone = $(textarea).parents('.rte-zone');
	this.minWidth = minWidth;
	this.maxWidth = maxWidth;
};

lwRTE_resizer.mousedown = function(resizer, e) {
	resizer.drag = true;
	resizer.event = (typeof(e) == "undefined") ? window.event : e;
	resizer.rte_obj = $(".rte-resizer", resizer.rte_zone).prev().eq(0);
	$('body', document).css('cursor', 'se-resize');
        $("#rte-iframe").contents().find("body").css('cursor', 'se-resize');
	return false;
}

lwRTE_resizer.mouseup = function(resizer, e) {
	resizer.drag = false;
	$('body', document).css('cursor', 'auto');
        $("#rte-iframe").contents().find("body").css('cursor', 'auto');
	return false;
}

lwRTE_resizer.mousemove = function(resizer, e) {
	if(resizer.drag) {
		e = (typeof(e) == "undefined") ? window.event : e;
		var w = Math.max(1, resizer.rte_zone.width() + e.screenX - resizer.event.screenX);
		var h = Math.max(1, resizer.rte_obj.height() + e.screenY - resizer.event.screenY);

		var isMinWidthOk = w >= resizer.minWidth;
		var isMaxWidthOk = typeof resizer.maxWidth != "number" || w <= resizer.maxWidth;

		if (isMinWidthOk && isMaxWidthOk) {
			resizer.rte_zone.width(w);
		}
		resizer.rte_obj.height(h);
		resizer.event = e;
	}
	return false;
};

var lwRTE = (function() {

        var $txtArea
            ,txtAreaPadding
            ,widthArray
            ,length
            ,MIN_WIDTH;

	$txtArea = $("<textarea>").css({"position":"absolute", "top":-9000, "left":-9000});

	// add textarea to dom to get default padding and width
        // only works in chrome(?), fallbacks are set...
	$("body").append($txtArea);

        // 4px: default bootstrap padding of a textarea
        txtAreaPadding  = $txtArea.css("padding") || "4px",
        widthArray      = txtAreaPadding.replace(/px/g, "").split(" "),
        length          = widthArray.length;

        switch(length) {
            case 4:
                // padding: top right bottom left
                //          0   1     2      3
                txtAreaPadding = parseInt(widthArray[1], 10) + parseInt(widthArray[3], 10);
                break;
            case 3:
                // padding: top rightAndLeft bottom
                //          0   1            2
                txtAreaPadding = parseInt(widthArray[1], 10) * 2;
                break;
            default:
                // padding: all
                //          0
                txtAreaPadding = parseInt(widthArray[0], 10) * 2;
                break;
        }

        // 210: default bootstrap width of a textarea
        MIN_WIDTH = txtAreaPadding + ($txtArea.width() || 210);

        // cleanup
        $txtArea.remove();
        delete $txtArea;
        delete txtAreaPadding
        delete widthArray
        delete length

	return function (textarea, options) {
            $txtArea.remove();
		this.css	= [];
		this.css_class	= options.frame_class || '';
		this.base_url	= options.base_url || '';
		this.width	= options.width || $(textarea).width() || 0;
		this.width	= this.width < MIN_WIDTH ? MIN_WIDTH : this.width;
		this.height	= options.height || $(textarea).height() || 350;
		this.iframe	= null;
		this.iframe_doc	= null;
		this.textarea	= null;
		this.event	= null;
		this.range	= null;
		this.toolbars	= {rte: '', html : ''};
		this.controls	= {rte: {disable: {hint: 'Source editor'}}, html: {enable: {hint: 'Visual editor'}}};

		$.extend(this.controls.rte, options.controls_rte || {});
		$.extend(this.controls.html, options.controls_html || {});
		$.extend(this.css, options.css || {});

		if(document.designMode || document.contentEditable) {
			$(textarea).wrap($('<div></div>').addClass('rte-zone').width(this.width));
			$('<div class="rte-resizer"><a href="#"></a></div>').insertAfter(textarea);

			var resizer = new lwRTE_resizer(textarea, MIN_WIDTH, options.maxWidth);


			$(".rte-resizer a", $(textarea).parents('.rte-zone')).mousedown(function(e) {
				$(document).mousemove(function(e) {
					return lwRTE_resizer.mousemove(resizer, e);
				});

				$(document).mouseup(function(e) {
					return lwRTE_resizer.mouseup(resizer, e)
				});

				var $iframe_body = $("#rte-iframe").contents().find("body");

				$iframe_body.mousemove(function(e){
					return lwRTE_resizer.mousemove(resizer, e)
				});

				$iframe_body.mouseup(function(e){
					return lwRTE_resizer.mouseup(resizer, e)
				});

				return lwRTE_resizer.mousedown(resizer, e);
			});

			this.textarea = textarea;
			this.enable_design_mode();
		}
	}
})();

lwRTE.prototype.editor_cmd = function(command, args) {
	this.iframe.contentWindow.focus();
	try {
		this.iframe_doc.execCommand(command, false, args);
	} catch(e) {
	}
	this.iframe.contentWindow.focus();
}

lwRTE.prototype.get_toolbar = function() {
	var editor = (this.iframe) ? $(this.iframe) : $(this.textarea);
	return (editor.prev().hasClass('rte-toolbar')) ? editor.prev() : null;
}

lwRTE.prototype.activate_toolbar = function(editor, tb) {
	var old_tb = this.get_toolbar();

	if(old_tb)
		old_tb.remove();

	$(editor).before($(tb).clone(true));
}
	
lwRTE.prototype.enable_design_mode = function() {
	var self = this;

	// need to be created this way
	self.iframe	= document.createElement("iframe");
	self.iframe.id = "rte-iframe";
	self.iframe.frameBorder = 0;
	self.iframe.frameMargin = 0;
	self.iframe.framePadding = 0;
	self.iframe.width = '100%';
	self.iframe.height = self.height || '100%';
	self.iframe.src	= "javascript:void(0);";

	if($(self.textarea).attr('class'))
		self.iframe.className = $(self.textarea).attr('class');

	if($(self.textarea).attr('id'))
		self.iframe.id = $(self.textarea).attr('id');

	if($(self.textarea).attr('name'))
		self.iframe.title = $(self.textarea).attr('name');

	var content	= $(self.textarea).val();

	$(self.textarea).hide().after(self.iframe).remove();
	self.textarea	= null;
	
	var css = '';
	
	for(var i in self.css)
		css += "<link type='text/css' rel='stylesheet' href='" + self.css[i] + "' />";

	var base = (self.base_url) ? "<base href='" + self.base_url + "' />" : '';
	var style = (self.css_class) ? "class='" + self.css_class + "'" : '';

	// Mozilla need this to display caret
	/*if($.trim(content) == '')
		content	= '<br>';*/

	var doc = "<html><head>" + base + css + "</head><body " + style + " style='padding:5px'>" + content + "</body></html>";

	self.iframe_doc	= self.iframe.contentWindow.document;

	try {
		self.iframe_doc.designMode = 'on';
	} catch ( e ) {
		// Will fail on Gecko if the editor is placed in an hidden container element
		// The design mode will be set ones the editor is focused
		$(self.iframe_doc).focus(function() { self.iframe_doc.designMode(); } );
	}

	self.iframe_doc.open();
	self.iframe_doc.write(doc);
	self.iframe_doc.close();

    var root_body = window.document.body;

    $(self.iframe_doc.body).click(function() {
       var dropdown = $(root_body).find(".btn-group.open");
       if (dropdown) {
           dropdown.each(function(i, e) {
               $(e).removeClass("open");
           });
       }
    });

	if(!self.toolbars.rte)
		self.toolbars.rte	= self.create_toolbar(self.controls.rte);

	self.activate_toolbar(self.iframe, self.toolbars.rte);

	$(self.iframe).parents('form').submit( 
		function() { self.disable_design_mode(true); }
	);

	$(self.iframe_doc).mouseup(function(event) { 
		if(self.iframe_doc.selection)
			self.range = self.iframe_doc.selection.createRange();  //store to restore later(IE fix)

		self.set_selected_controls( (event.target) ? event.target : event.srcElement, self.controls.rte); 
	});

	$(self.iframe_doc).blur(function(event){ 
		if(self.iframe_doc.selection) 
			self.range = self.iframe_doc.selection.createRange(); // same fix for IE as above
	});

	$(self.iframe_doc).keyup(function(event) { self.set_selected_controls( self.get_selected_element(), self.controls.rte); });

	// Mozilla CSS styling off
	if(!$.browser.msie)
		self.editor_cmd('styleWithCSS', false);
}

lwRTE.prototype.disable_design_mode = function(submit) {
	var self = this;

	self.textarea = (submit) ? $('<input type="hidden" />').get(0) : $('<textarea></textarea>').width('100%').height(self.height).get(0);

	if(self.iframe.className)
		self.textarea.className = self.iframe.className;
	
	if(self.iframe.id)
		self.textarea.id = self.iframe.id;
		
	if(self.iframe.title)
		self.textarea.name = self.iframe.title;
	
	$(self.textarea).val($('body', self.iframe_doc).html());
	$(self.iframe).before(self.textarea);

	if(!self.toolbars.html)
		self.toolbars.html	= self.create_toolbar(self.controls.html);

	if(submit != true) {
		$(self.iframe_doc).remove(); //fix 'permission denied' bug in IE7 (jquery cache)
		$(self.iframe).remove();
		self.iframe = self.iframe_doc = null;
		self.activate_toolbar(self.textarea, self.toolbars.html);
	}
}

lwRTE.prototype.toolbar_click = function(obj, control, value) {
	var fn = control.exec;
	var args = control.args || [];

	if(fn) {
		if(value)
			args.push(obj);

		try {
			fn.apply(this, args);
		} catch(e) {
			throw new Error(e);
		}
	} else if(this.iframe && control.command) {
		if(value) args = value;

		this.editor_cmd(control.command, args);
	}
}
	
lwRTE.prototype.create_toolbar = function(controls) {
	var self = this;
	var $ul = $("<ul></ul>");

	//var tb = $("<div></div>").addClass('rte-toolbar').width('100%').append($("<ul></ul>")).append($("<div></div>").addClass('clear'));
	
	for (var key in controls){
		(function(key){

			var obj, li, $btn, $caret, $dropdown;

			if(controls[key].separator) {
				li = $("<li></li>").addClass('rte-separator');

			} else {
				if(controls[key].init) {
					try {
						controls[key].init.apply(controls[key], [this]);
					} catch(e) {
					}
				}

				if(controls[key].dropdown) {

					obj = $("<div></div>").addClass("btn-group");

					$dropdown = $("<ul></ul>").addClass("dropdown-menu");
					for (var i = 0; i < controls[key].dropdown.items.length; i++) {
						(function(i){
							
							var $dropdownItem = $("<li>");

							var $dropdownItemLink = $("<a></a>")
								.html(controls[key].dropdown.items[i].title)
								.click(function(e) {
									self.event = e;
									self.toolbar_click($dropdownItemLink, controls[key], controls[key].dropdown.items[i].value); 
								});

							$dropdownItem.append($dropdownItemLink);
							$dropdown.append($dropdownItem);
						})(i);
					}

					$caret = $("<span></span>").addClass("caret");
					$btn = $("<button></button>")
							.addClass("btn btn-mini dropdown-toggle")
							.attr("data-toggle", "dropdown")
							.html(controls[key].dropdown.title)
							.append($caret);

					obj.append($btn).append($dropdown);

				} else if(controls[key].select) {
					obj = $("<div></div>").html(controls[key].select);
					$(obj).find("a").each(function(idx, a) {
						$(a).click(function(e) {
							self.event = e;
							self.toolbar_click(this, controls[key]);
						});
					});

				} else {
					obj = $("<a href='#'></a>")
					 	.attr('title', (controls[key].hint) ? controls[key].hint : key)
					 	.attr('rel', key)
					 	.click( function(e) {
					 		self.event = e;
					 		self.toolbar_click(this, controls[this.rel]); 
					 		return false;
					 	});
				}

				li = $("<li></li>").append(obj.addClass(key));
			}

			$ul.append(li);
		})(key);
	}

	var $clear = $("<div>").css({clear: "both"});
	var tb = $("<div></div>").addClass("rte-toolbar")
			.append($ul)
			.append($clear);

	$('.enable', tb).click(function() {
		self.enable_design_mode();
		return false; 
	});

	$('.disable', tb).click(function() {
		self.disable_design_mode();
		return false; 
	});

	return tb.get(0);
}

/*
 * @props { title : string,
 *			body : string,
 *			btnOkText : string,
 *			btnCancelText : string,
 *			onOkClicked : function,
 *			onCancelClicked : function,
 *			animationEnabled : boolean }
 */
lwRTE.prototype.create_panel = function(props) {

	var $modal
	    ,$modalHeader
	    ,$modalBody
	    ,$modalFooter
	    ,$title			// titel of the modal, modal-header
		,$btnClose		// close button, top right
	    ,$btnCancel		// cancel button, footer
	    ,$btnOk;		// ok button, footer

	var title				= props.title || ""
		,body				= props.body
		,btnOkText			= props.btnOkText || "Ok"
		,btnCancelText		= props.btnCancelText
		,onOkClicked		= props.onOkClicked
		,onCancelClicked	= props.onCancelClicked
		// TODO configurable default value for animation?
		,animationEnabled	= props.animationEnabled || true;

	/* --- HEADER -------------------------------*/
	$btnClose = $("<button></button>")
		.addClass("close")
		.attr({
			"type": "button"
			, "data-dismiss": "modal"
			, "aria-hidden": "true"
		})
		.append("x");

	$title = $("<h3></h3>")
		.attr("id", "modalLabel")
		// TODO security
		.append(title);

	$modalHeader = $("<div></div>")
		.addClass("modal-header")
		.append($btnClose)
		.append($title);


	/* --- BODY ---------------------------------*/
	$modalBody = $("<div></div>")
		.addClass("modal-body")
		// TODO security
		.append(body);


	/* --- FOOTER -------------------------------*/
	if (btnCancelText) {
		// cancel button is optional

		$btnCancel = $("<button></button>")
			.addClass("btn")
			.attr({"data-dismiss": "modal", "aria-hidden": "true"})
			.click(function() {
				if (onCancelClicked) {
					onCancelClicked();
				}
				$modal.modal("hide");
				// as long as $modal is no singleton, we have to remove it from the dom
				$modal.remove();
			})
			// TODO security
			.append(btnCancelText);
	}

	$btnOk = $("<button></button>")
		.addClass("btn btn-primary")
		.click(function() {
			if (onOkClicked) {
				onOkClicked();
			}
			$modal.modal("hide");
			// as long as $modal is no singleton, we have to remove it from the dom
			$modal.remove();
		})
		// TODO security
		.append(btnOkText);

	$modalFooter = $("<div></div>").addClass("modal-footer");
	if ($btnCancel) {
		// cancel button must be added first to be on the left side of the ok button
		$modalFooter.append($btnCancel);
	}
	$modalFooter.append($btnOk);

	/* --- MODAL ----------------------------*/
	$modal = $("<div></div>")
		.addClass("rte-panel modal hide")
		.attr({
			"id" : "myModal"
			, "tabindex": "-1"
			, "role": "dialog"
			, "aria-labelledby": "modalLabel"
			, "aria-hidden": "true"
		})
		.append($modalHeader)
		.append($modalBody)
		.append($modalFooter);

	if (animationEnabled) {
		$modal.addClass("fade");
	}

	$modal.modal("show");

	return $modal;

}

lwRTE.prototype.get_content = function() {
	return (this.iframe) ? $('body', this.iframe_doc).html() : $(this.textarea).val();
}

lwRTE.prototype.set_content = function(content) {
	(this.iframe) ? $('body', this.iframe_doc).html(content) : $(this.textarea).val(content);
}

lwRTE.prototype.set_selected_controls = function(node, controls) {
	var toolbar = this.get_toolbar();

	if(!toolbar)
		return false;
		
	var key, i_node, obj, control, tag, i, value;

	try {
		for (key in controls) {
			control = controls[key];
			obj = $('.' + key, toolbar);

			obj.removeClass('active');

			if(!control.tags)
				continue;

			i_node = node;
			do {
				if(i_node.nodeType != 1)
					continue;

				tag	= i_node.nodeName.toLowerCase();
				if($.inArray(tag, control.tags) < 0 )
					continue;

				if(control.select) {
					obj = obj.get(0);
					if(obj.tagName.toUpperCase() == 'SELECT') {
						obj.selectedIndex = 0;

						for(i = 0; i < obj.options.length; i++) {
							value = obj.options[i].value;
							if(value && ((control.tag_cmp && control.tag_cmp(i_node, value)) || tag == value)) {
								obj.selectedIndex = i;
								break;
							}
						}
					}
				} else
					obj.addClass('active');
			}  while(i_node = i_node.parentNode)
		}
	} catch(e) {
	}
	
	return true;
}

lwRTE.prototype.get_selected_element = function () {
	var node, selection, range;
	var iframe_win	= this.iframe.contentWindow;
	
	if (iframe_win.getSelection) {
		try {
			selection = iframe_win.getSelection();
			range = selection.getRangeAt(0);
			node = range.commonAncestorContainer;
		} catch(e){
			return false;
		}
	} else {
		try {
			selection = iframe_win.document.selection;
			range = selection.createRange();
			node = range.parentElement();
		} catch (e) {
			return false;
		}
	}

	return node;
}

lwRTE.prototype.get_selection_range = function() {
	var rng	= null;
	var iframe_window = this.iframe.contentWindow;
	this.iframe.focus();
	
	if(iframe_window.getSelection) {
		rng = iframe_window.getSelection().getRangeAt(0);
		if($.browser.opera) { //v9.63 tested only
			var s = rng.startContainer;
			if(s.nodeType === Node.TEXT_NODE)
				rng.setStartBefore(s.parentNode);
		}
	} else {
		this.range.select(); //Restore selection, if IE lost focus.
		rng = this.iframe_doc.selection.createRange();
	}

	return rng;
}

lwRTE.prototype.get_selected_text = function() {
	var iframe_win = this.iframe.contentWindow;

	if(iframe_win.getSelection)	
		return iframe_win.getSelection().toString();

	this.range.select(); //Restore selection, if IE lost focus.
	return iframe_win.document.selection.createRange().text;
};

lwRTE.prototype.get_selected_html = function() {
	var html = null;
	var iframe_window = this.iframe.contentWindow;
	var rng	= this.get_selection_range();

	if(rng) {
		if(iframe_window.getSelection) {
			var e = document.createElement('div');
			e.appendChild(rng.cloneContents());
			html = e.innerHTML;		
		} else {
			html = rng.htmlText;
		}
	}

	return html;
};

lwRTE.prototype.selection_replace_with = function(html) {
	var rng	= this.get_selection_range();
	var iframe_window = this.iframe.contentWindow;

	if(!rng)
		return;
	
	this.editor_cmd('removeFormat'); // we must remove formating or we will get empty format tags!

	if(iframe_window.getSelection) {
		rng.deleteContents();
		rng.insertNode(rng.createContextualFragment(html));
		this.editor_cmd('delete');
	} else {
		this.editor_cmd('delete');
		rng.pasteHTML(html);
	}
}