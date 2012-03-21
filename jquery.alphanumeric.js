(function ($) {

    $.fn.alphanumeric = function (p) {

        p = $.extend({
            ichars: "!@#$%^&*()+=[]\\\';,/{}|\":<>?~`.- ",
            nchars: "",
            wchars: "", // optional whitelist of acceptable chars
            whiteList: false, // true to use white list of allowed values instead of default blacklist
            decimal: false, // true for one '.' char within inputed value
            negative: false, // true for one '-' char only at beginning of inputted value
            allowPaste: false, // enables pasting into field via context menu (right click) or ctrl+v
            allow: "" // add characters to allow, e.g., allow:'$:'
        }, p);

        /*
        * Finds location of cursor on input (based on code from http://javascript.nwbox.com/cursor_position/)
        * @param o object (input)
        */
        function getValueStart(o) {
            if (o.createTextRange) {
                var r = document.selection.createRange().duplicate();
                r.moveEnd('character', o.value.length);
                if (r.text == '') return o.value.length;
                return o.value.lastIndexOf(r.text);
            } else return o.selectionStart;
        }

        /*
        * Set the selection (based on code from http://javascript.nwbox.com/cursor_position/)
        * @param o object (input)
        * @param p position ([start, end] or just start)
        */
        function setValue(o, p) {
            try
            {
                // if p is number, start and end are the same
                if (typeof p == "number") p = [p, p];
                // only set if p is an array of length 2
                if (p && p.constructor == Array && p.length == 2) {
                    if (o.createTextRange) {
                        var r = o.createTextRange();
                        r.collapse(true);

                        //IE Fix. If start = end, we must use move instead.
                        if(p[0] === p[1])
                            r.move('character', p[0]);
                        else {
                            r.moveStart('character', p[0]);
                            r.moveEnd('character', p[1]);
                        }

                        r.select();
                    }
                    else if (o.setSelectionRange) {
                        o.focus();
                        o.setSelectionRange(p[0], p[1]);
                    }
                }
            } catch(e) {}
        }

        /*
        * Returns true if control/key or nav key press
        * @param e event
        */
        function isSpecialKeyPress(e) {
            var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
            // allow Ctrl+A
            if ((e.ctrlKey && key == 97 /* firefox */) || (e.ctrlKey && key == 65) /* opera */) return true;
            // allow Ctrl+X (cut)
            if ((e.ctrlKey && key == 120 /* firefox */) || (e.ctrlKey && key == 88) /* opera */) return true;
            // allow Ctrl+C (copy)
            if ((e.ctrlKey && key == 99 /* firefox */) || (e.ctrlKey && key == 67) /* opera */) return true;
            // allow Ctrl+Z (undo)
            if ((e.ctrlKey && key == 122 /* firefox */) || (e.ctrlKey && key == 90) /* opera */) return true;
            // allow or deny Ctrl+V (paste), Shift+Ins
            if ((e.ctrlKey && key == 118 /* firefox */) || (e.ctrlKey && key == 86) /* opera */
	            || (e.shiftKey && key == 45)) return true;

            if (
			    key == 8 /* backspace */ ||
			    key == 9 /* tab */ ||
			    key == 13 /* enter */ ||
			    key == 16 /* shift */ ||
			    key == 35 /* end */ ||
			    key == 36 /* home */ ||
			    key == 37 /* left */ ||
			    key == 39 /* right */ ||
			    (key == 46 && e.charCode == 0 /* del */)
		    ) return true;
        }

        /*
        * Filters out all values within input for decimal/negative options
        * @param e event
        * @param ch blacklist of disallowed values
        * @param wl optional whitelist of allowed values
        */
        function filterValue(e, ch, wl) {
            if (!e.charCode) k = String.fromCharCode(e.which);
            else k = String.fromCharCode(e.charCode);

            var value = $(this).val();
            if (value && value.length > 0) {
                // get carat (cursor) position
                var carat = getValueStart(this);
                // get length of the value (to loop through)
                var length = value.length;
                // loop backwards (to prevent going out of bounds)
                for (var i = length - 1; i >= 0; i--) {
                    var k = value.charAt(i);
                    if(p.negative) {
                        // remove '-' if it is in the wrong place
                        if (i != 0 && k == "-") {
                            value = value.substring(0, i) + value.substring(i + 1);
                        }
                    }
                    // if not a valid character, or a space, remove
                    if (ch.indexOf(k) != -1 || k == " " || (p.whiteList && wl.indexOf(k) == -1)) {
                        value = value.substring(0, i) + value.substring(i + 1);
                    }
                }

                // if decimal option, remove extra decimal characters
                if (p.decimal) {
                    var firstDecimal = value.indexOf(".");
                    var length = value.length;
                    for (var i = length - 1; i > firstDecimal; i--) {
                        var k = value.charAt(i);
                        // remove decimal character
                        if (k == ".") {
                            value = value.substring(0, i) + value.substring(i + 1);
                        }
                    }
                }

                // set the value and prevent the cursor moving to the end
                this.value = value;
                setValue(this, carat);
            }
        }

        return this.each
			(
				function () {

				    // build blacklist of characters that are not allowed and remove from list any that have been explicitly allowed
				    if (p.nocaps) p.nchars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				    if (p.allcaps) p.nchars += "abcdefghijklmnopqrstuvwxyz";

				    // optionally add - and . to list of allowed characters
				    if (p.negative && p.allow.indexOf('-') == -1) p.allow = p.allow + '-';
				    if (p.decimal && p.allow.indexOf('.') == -1) p.allow = p.allow + '.';

				    // optionally build up and use whitelist of allowed characters
				    if (p.whiteList) p.wchars += p.allow;
				    var wl = p.wchars;

				    // regex to remove from blacklist characters that have been explicitly allowed
				    s = p.allow.split('');
				    for (i = 0; i < s.length; i++) if (p.ichars.indexOf(s[i]) != -1) s[i] = "\\" + s[i];
				    p.allow = s.join('|');
				    var reg = new RegExp(p.allow, 'gi');
				    var ch = p.ichars + p.nchars;
				    ch = ch.replace(reg, '');

				    // filter on keypress
				    $(this).keypress(function (e) {
				        if (isSpecialKeyPress(e))
				            return;

				        // get character
				        if (!e.charCode) k = String.fromCharCode(e.which);
				        else k = String.fromCharCode(e.charCode);

				        // preventdefault (dont allow insert of character) if character fails list match
				        if (ch.indexOf(k) != -1) e.preventDefault();
				        if (p.whiteList && wl.indexOf(k) == -1) e.preventDefault();
				        if (p.allowPaste && (e.ctrlKey && k == 'v')) e.preventDefault();

				        // if negative option, allow only one negative and only in first position
				        if ((k === '-' && p.negative) && (getValueStart(this) != 0)) {
				            e.preventDefault();
				        }
				    });

				    // handle multi decimal/negative and ctrl+v paste in
				    $(this).keyup(function (e) {
				        if (isSpecialKeyPress(e))
				            return;

				        filterValue.call(this, e, ch, wl);
				    });

				    // for context menu paste (keyup will handle ctrl+v also) or drag
				    $(this).bind('paste focus', function (e) {
				        var self = this;
				        window.setTimeout(function () {
				            filterValue.call(self, e, ch, wl);
				        }, 0);
				    });

				    // enable/disable context menu (scenerios where we restrict the mouse paste option)
				    if (!p.allowPaste) $(this).bind('contextmenu', function () { return false });
				}
			);
    };

    $.fn.numeric = function (p) {

        var az = "abcdefghijklmnopqrstuvwxyz";
        az += az.toUpperCase();

        var nm = "0123456789";

        p = $.extend({
            nchars: az,
            wchars: nm
        }, p);

        return this.each(function () {
            $(this).alphanumeric(p);
        }
		);

    };

    $.fn.alpha = function (p) {

        var nm = "1234567890";

        var az = "abcdefghijklmnopqrstuvwxyz";
        az += az.toUpperCase();

        p = $.extend({
            nchars: nm,
            wchars: az
        }, p);

        return this.each(function () {
            $(this).alphanumeric(p);
        }
		);

    };

})(jQuery);