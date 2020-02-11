/* ----------------------------------------
--------------- globals -------------------
-------------------------------------------*/
const rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))helpers/;
const helpers = {};
const forEach = Array.prototype.forEach;
const slice = Array.prototype.slice;
window.guid = 0;
/* https://stackoverflow.com/questions/30880757/javascript-equivalent-to-on */
if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.matchesSelector || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || (s => {let matches = helpers.query(s), i = matches.length;while (--i >= 0 && matches.item(i) !== this) {}return i > -1;});
/* ----------------------------------------
------Query Helpers-------
-------------------------------------------*/
/* original snippet by kris siegel: https://gist.github.com/KrisSiegel/1824261b7da41adafe17 */
helpers.queryAll = function(selector, context = document) { //querySelectorAll with :eq()
    if (!selector || selector === undefined) return null;
    let queue = [];
    let process = function (input) {
        if (input.indexOf(":eq(") === -1) return undefined;
        let eqlLoc = input.indexOf(":eq(");
        let sel = input.substring(0, eqlLoc);
        let ind = input.substring((eqlLoc + 4), input.indexOf(")", eqlLoc));
        selector = input.substring(input.indexOf(")", eqlLoc) + 1, input.length);
        if (sel.charAt(0) === ">") sel = sel.substring(1, sel.length);
        if (selector.charAt(0) === ">") selector = selector.substring(1, selector.length);
        queue.push({
            selector: sel,
            index: ind
        });
    }
    if (!selector.indexOf) return [selector]; //is an element
    while (selector.indexOf(":eq") !== -1) process(selector);
    let result = context;
    while (queue.length > 0) {
        let item = queue.shift();
        result = result.querySelectorAll(item.selector)[item.index];
    }
    if (selector.trim().length > 0) return result.querySelectorAll(selector);
    return [result];
};
helpers.quickQuery = function(selector, context = document) {
    const test = rquickExpr.exec(selector);
    if (!test) return;
    if (test[1]) { //matched id regex
        const el = document.getElementById(test[1]);
        if (!el || (el && el.id !== test[1])) return []; //in case getById matches by name
        return [el];
    } else if (test[2]) { //matched tag regex
        return context.getElementsByTagName(selector);
    } else if (test[3]) { //matched class regex
        return context.getElementsByClassName(test[3]);
    }
};
helpers.query = function(selector, context = document) {
    let res = helpers.quickQuery(selector, context);
    if (!res) res = helpers.queryAll(selector, context);
    return res;
};
helpers.element = function(data) { //extract dom el from htmlstring/query
    if (!data) return;
    if (data && data.isQuery) return data[0];
    if (typeof data === "string") {
        let el = document.createElement('div');
        el.innerHTML = data;
        return !el.firstChild.localName ? undefined : el.firstChild; //(!isHTML) ? false : domEl
    }
    return data; //already is el
};
helpers.copy = function(query) {
    const copy = new FrankenQuery();
    helpers.setResults(copy, query.res);
    copy.selector = query.selector;
    return copy;
};
helpers.setResults = function(a, b) {helpers.changeResults(a, b, true);};
helpers.changeResults = function(query, results = [], setResults = false) {
    if (results.length === undefined) results = [results];
    if (results.isQuery) results = slice.call(results.res);
    let copy = query;
    if (!setResults) copy = helpers.copy(query);
    copy.selector = query.selector;
    for (let i in copy.res) delete copy[i];
    for (let i in results) if (!isNaN(i)) copy[i] = results[i];
    copy.res = results;
    copy.length = (results || []).length;
    if (!setResults) {
        copy.selector += "=>helpers";
        copy.prevObject = query;
        return copy;
    }
};
/* ----------------------------------------
---------------- events -------------------
-------------------------------------------*/
helpers.ev = function(ctx, args, fn) { //adds fn to front of args[]
    let a = slice.call(args);
    a.splice(0, 0, fn);
    return ctx.event.apply(ctx, a);
};
helpers.getAndRemoveHandler = function(ev, el, sel, handler) {
    let handlers = (el.helperseventHandlers || {})[ev];
    if (!handlers || !handlers.length) return handler;
    if (!handler.guid) return el.helperseventHandlers.splice(0, 1)[0];
    el.helperseventHandlers[ev] = handlers.filter(cur => {
        if (cur.guid !== handler.guid) return false;
        handler = cur;
        return true;
    });
    return handler;
};
helpers.addHandler = function(ev, el, handler) {
    handler.guid = (handler.guid || window.guid++);
    if (!el.helperseventHandlers) el.helperseventHandlers = {};
    if (!el.helperseventHandlers[ev]) el.helperseventHandlers[ev] = [];
    el.helperseventHandlers[ev].push(handler);
};
helpers.on = function(el, ev, sel, handler, bubbling = false, _one) {
    const callback = function handlerFunction(event) {
        event.originalEvent = event; //jQuery compatability
        if (_one) {
            helpers.off(el, event.type, sel, callback, bubbling);
            if (event.type === 'animationend') ["webkit", "o", "MS"].forEach(type => helpers.off(el, type + "AnimatonEnd", sel, callback, bubbling));
            if (event.type === 'transitionend') ["webkit", "o", "MS"].forEach(type => helpers.off(el, type + "TransitionEnd", sel, callback, bubbling));
        }
        let tar = event.target;
        if (!sel) return handler.call(el, event, el);
        while (tar && tar !== this) {
            if (tar.matches(sel)) handler.call(tar, event, tar);
            tar = tar.parentNode;
        }
    };
    helpers.addHandler(ev, el, callback);
    el.addEventListener(ev, callback, bubbling);
};
helpers.off = function(el, ev, sel, handler, bubbling = false) {
    function removeListener(el, ev, sel, handler, bubbling) {
        if (typeof sel === "function") {handler = sel;sel = null;}
        if (handler) handler.guid = handler.guid || window.guid++;
        el.removeEventListener(ev, helpers.getAndRemoveHandler(ev, el, sel, handler), bubbling);
    }
    if (!ev) { //remove all events
        Object.keys(el.helperseventHandlers).forEach(ev => el.helperseventHandlers[ev].forEach(handler => removeListener(el, ev, sel, handler, bubbling)));
        el.helperseventHandlers[ev].forEach(handler => removeListener(el, ev, sel, handler, bubbling));
    } else if (!handler) { //remove all events of type
        el.helperseventHandlers[ev].forEach(handler => removeListener(el, ev, sel, handler, bubbling));
    } else removeListener(el, ev, sel, handler, bubbling);
    return this;
};
helpers.documentReady = function(cb = function() {}) {
    helpers.on(document, 'DOMContentLoaded', undefined, function() {
        if (!document.body) return (function loopLoad() {
            if (document.body) return window.loadCallback();
            setTimeout(loopLoad, 1);
        })();
        if (window.loadCallback) window.loadCallback();
    });
    window.loadCallback = cb;
};
/* ----------------------------------------
---------------- ajax -------------------
-------------------------------------------*/
helpers.get = function(url, data, success, dataType) {
    if (typeof url === "object") return helpers.ajax(url);
    if (typeof data === "function") {
        success = data;
        data = null;
    }
    helpers.ajax({url: url, data: data, dataType: dataType, success: success});
};
helpers.put = function(url, data, success, dataType) {
    if (typeof url === "object") {
        url.method = 'PUT';
        return helpers.ajax(url);
    }
    if (typeof data === "function") {
        success = data;
        data = null;
    }
    helpers.ajax({url: url, data: data, method: 'PUT', dataType: dataType, success: success});
};
helpers.delete = function(url, data, success, dataType) {
    if (typeof url === "object") {
        url.method = 'DELETE';
        return helpers.ajax(url);
    }
    if (typeof data === "function") {
        success = data;
        data = null;
    }
    helpers.ajax({url: url, data: data, method: 'DELETE', dataType: dataType, success: success});
};
helpers.post = function(url, data, success, dataType) {
    if (typeof url === "object") {
        url.method = 'POST';
        return helpers.ajax(url);
    }
    if (typeof data === "function") {
        success = data;
        data = null;
    }
    helpers.ajax({url: url, data: data, method: 'POST', dataType: dataType, success: success});
};
helpers.ajax = function(url, settings = {}) {
    const nonGets = {'put':1,'post':1,'delete':1};
    function urlify(url, method, data) {
        let dataString = '';
        for (let key in data) dataString += key + "=" + escape(data[key]) + "&";
        dataString = dataString.slice(0, -1);
        if (!nonGets[(method || '').toLowerCase()]) url = url + (url.indexOf('?') >= 0 ? '&' : '?') + dataString; //GET method, so add dataString to end
        return {data: dataString, url: url};
    }
    if (url.url) {
        settings = url;
        url = url.url;
    }
    let urlified = urlify(url, settings.method, settings.data);
    if (nonGets[(settings.method || '').toLowerCase()]) {
        settings.headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
        settings.body = urlified.data;
    }
    if (settings.contentType) settings.headers = new Headers({'Content-type': settings.contentType});
    let res = fetch(url, settings);
    if (settings && settings.dataType) res = res.then(data => data[settings.dataType.toLowerCase()]());
    else res = res.then(data => data.text());
    if (settings.success) res.then(data => settings.success(data));
    if (settings.error) res.catch(e => settings.error(e));
    res.done = res.then;
    return res;
};
helpers.getJSON = function(url, data, callback = function() {}) {
    //TODO: if local url, use return helpers.ajax, else proceed
    let isJP = url.split("jsoncallback=?")
    if (isJP.length - 1 > 0) {
        function jsonp(url, callback) { /* https://stackoverflow.com/questions/22780430/javascript-xmlhttprequest-using-jsonp */
            let callbackName = 'callback' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                callback(data);
            };
            let script = document.createElement('script');
            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'jsoncallback=' + callbackName;
            document.body.appendChild(script);
            return script.src;
        }
        url = isJP[0].substr(0, isJP[0].length - 1); //remove ('&' or '?') & 'jsoncallback=?'
        let x = 0;
        for (let i in data) url += (x++ === 0 ? '?' : '&') + i + "=" + data[i];
        return jsonp(url, callback);
    }
};

class FrankenQuery {
    constructor(selector) {
        //debug(selector); //can make things pretty slow
        if (selector && selector.isQuery) return selector;
        if (typeof selector === "function") return fn.documentReady(selector);
        let el, res = fn.quickQuery(selector); //test for simple queries: ex: fn('#id'), fn('.class'), fn('tag')
        if (!res && (el = fn.element(selector))) {
            if (el === window) selector = "window";
            else if (el === document) selector = "document";
            else if (el === document.body) selector = "body";
            else selector = selector.selector || (el.localName + (!el.id?"": "#"+el.id) + (!el.className?"": "." + el.className.replace(/ /g, "."))); //TODO: + "eq(#)"
        }
        if (typeof selector === "string" && el) res = [el];
        res = res || fn.queryAll(selector) || [];
        this.selector = selector;
        this.isQuery = true;
        this.__proto__.toString = () => '[FrankenQuery Object]';
        fn.setResults(this, res);
    }
    add(query) { //combine two queries results
        let res = slice.call(this.res).concat(slice.call(query.res));
        res.forEach((tarEl, tarI) => res.forEach((cur, i) => (i !== tarI && tarEl === cur) ? res.splice(i, 1) : 0)); //remove duplicates
        return fn.changeResults(this, res);
    }
    each(callback = function() {}) {
        forEach.call(this.res, function(el, i) {callback.call(el, i, el);});
        return this;
    }
    find(selector) {
        let res = [];
        this.each((i, el) => {
            Array.from(fn.query(selector, el)).forEach((el, i) => res.push(el));
        });
        return fn.changeResults(this, res);
    }
    slice(...a) {return this.slice.apply(this.res, a);}
    eq(index) {return this.get(index);}
    get(index) {
        if (!index && index !== 0) return this.result || this.res;
        return this.res[index];
    }
    prev() {
        let prevs = [];
        this.each((i, el) => prevs.push(el.previousElementSibling));
        return fn.changeResults(this, prevs.filter(el => el !== null));
    }
    next() {
        let nexts = [];
        this.each((i, el) => nexts.push(el.nextElementSibling));
        return fn.changeResults(this, nexts.filter(el => el !== null));
    }
    index(tar) {
        if (!tar) { //eq() based on # same tag siblings within parent
            let res = this.siblings().res;
            for (let i in res) if (this[0] === res[i]) return Number(i);
        }
        tar = fn.element(tar); //find index from tar in query
        if (!tar) tar = (fn.query(tar) || "")[0];
        if (tar) for (let i in this.res) if (this.res[i] === tar) return Number(i);
        return -1;
    }
    first() {return fn.changeResults(this, [this.get(0)]);}
    last() {return fn.changeResults(this, [this.get(this.length - 1)]);}
    clone() {
        let clones = [];
        this.each((i, el) => clones.push(el.cloneNode(true)));
        return fn.changeResults(this, clones);
    }
    remove() {return this.each((i, el) => el.parentNode.removeChild(el));}
    replaceWith(data) {
        let outer = fn.element(data);
        outer = (outer && outer.outerHTML) || data;
        return this.each((i, el) => el.outerHTML = outer);
    }
    map(callback = function() {}) {
        let self = this;
        this.result = []; //retrieved w/ .get()
        let res = [].filter.call(this.res, function(el, i) {
            let toInclude = callback(el, i);
            self.result.push(toInclude);
            if (toInclude === null) return false;
            return true;
        });
        return fn.changeResults(this, res);
    }
    reduce() {} //TODO
    filter() {} //TODO
    parent() {
        let parents = [];
        this.each((i, el) => {
            if (!el.parentNode) return;
            for (let i in parents) if (parents[i] === el.parentNode) return;
            parents.push(el.parentNode);
        });
        return fn.changeResults(this, parents);
    }
    parents(sel) {
         function getParents(el, sel) {
            for (; el && el !== document; el = el.parentNode) {
                if (sel) {
                    if (el.matches(sel)) res.push(el);
                    continue;
                }
                res.push(el);
            }
        }
        let res = [];
        this.each((i, el) => getParents(el, sel));
        return res;
    }
    children() {
        let children = [];
        this.each((i, el) => Array.from(el ? el.children : []).forEach(child => children.push(child)));
        return fn.changeResults(this, children);
    }
    siblings() {
        let cache = this.res; //change w/ .parent()
        let siblings = [];
        this.parent();
        this.each((i, parent) => Array.from(parent.children).forEach(child => {
            siblings.push(child);
        }));
        cache.forEach(el => { //if you are in the cache, you are out, you cannot be a sibling to yourself
            let index = siblings.indexOf(el);
            if (index !== -1) siblings.splice(index, 1);
        });
        return fn.changeResults(this, siblings);
    }
    empty() {return this.each((i, el) => el.innerHTML = "");}
    appendTo(selector) {
        let el;
        if (typeof selector === "string") el = fn(selector)[0]; else el = fn.element(selector);
        if (!el) el = fn.query(selector)[0];
        return this.each((i, cur) => el.appendChild(cur));
    }
    append(data) {
        if (typeof data === "number") data += '';
        data = fn.element(data) || document.createTextNode(data || '');
        return this.each((i, el) => el.appendChild(data));
    }
    prependTo() {} //TODO: 
    prepend(data) {
        if (typeof data === "number") data += '';
        data = fn.element(data) || document.createTextNode(data || '');
        return this.each((i, el) => el.insertBefore(data, el.firstChild));
    }
    before(a) {return this.after(a, true);}
    after(data, before) {
        data = fn.element(data) || data;
        const buff = (data && data.outerHTML) || data || '';
        return this.each((i, el) => el.insertAdjacentHTML((before ? 'beforebegin' : 'afterend'), buff));
    }
    serialize() { /* serialize 0.2 */
        function serialize(form){if(!form||form.nodeName!=="FORM"){return }var i,j,q=[];for(i=form.elements.length-1;i>=0;i=i-1){if(form.elements[i].name===""){continue}switch(form.elements[i].nodeName){case"INPUT":switch(form.elements[i].type){case"text":case"hidden":case"password":case"button":case"reset":case"email":case"submit":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"checkbox":case"radio":if(form.elements[i].checked){q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value))}break;case"file":break;default:break}break;case"TEXTAREA":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"SELECT":switch(form.elements[i].type){case"select-one":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;case"select-multiple":for(j=form.elements[i].options.length-1;j>=0;j=j-1){if(form.elements[i].options[j].selected){q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].options[j].value))}}break;default:break}break;case"BUTTON":switch(form.elements[i].type){case"reset":case"submit":case"button":q.push(form.elements[i].name+"="+encodeURIComponent(form.elements[i].value));break;default:break}break;default:break}}return q.join("&")};
        let query = '';
        this.each((i, el) => {
            let res = serialize(el);
            query += res.length ? (query.length ? "&" : "") + res : "";
        });
        return query;
    }
    val(v) {return this.attr('value', v);}
    text(v) {return this.attr('textContent', v);}
    html(v) {return this.attr('innerHTML', v);}
    removeAttr(attr) {return this.each((i, el) => (attr.length ? attr : [attr]).forEach(cur => el.removeAttribute(cur)));}
    attr(props, set) {
        if (!this.length) return;
        function setVal(el, prop, val) {
            switch(prop) {
                case 'value':
                case 'textContent':
                case 'innerHTML':
                    el[prop] = val;
                    return;
                default:break;
            }
            el.setAttribute(prop, val);
        }
        if (set !== undefined) return this.each((i, el) => setVal(el, props, set));
        if (typeof props === "string") return this[0][props];
        return this.each((i, el) => {for (let prop in props) setVal(el, prop, props[prop]);});
    }
    hasClass(tarClass) {
        let has = false;
        this.each((i, el) => {
            if (el.classList && el.classList.contains(tarClass)) has = true;
            else if (new RegExp('(^| )' + tarClass + '( |fn)', 'gi').test(el.className)) has = true;
        });
        return has;
    }
    addClass(tarClass) {return this.each((i, el) => el.className += ' ' + tarClass);}
    removeClass(tarClass) {return this.each((i, el) => el.className = el.className.replace(new RegExp('(^|\\b)' + tarClass.split(' ').join('|') + '(\\b|fn)', 'gi'), ' '));}
    offsetParent() {
        return fn.changeResults(this, [this[0].offsetParent || this[0]]);
    }
    offset() {
        const {top, right, bottom, left, width, height, x, y} = this[0].getBoundingClientRect();
        return {top, right, bottom, left, width, height, x, y}
    }
    position() {
        if (!this.length) return;
        let offsetParent = this.offsetParent(),
            offset = this.offset(),
            parentOffset = /^body|html$/i.test(offsetParent[0].tagName) ? {
                top: 0,
                left: 0
            } : offsetParent.offset();
        const style = getComputedStyle(this[0]);
        const parentStyle = getComputedStyle(offsetParent[0]);
        offset.top -= parseFloat(style.marginTop);
        offset.left -= parseFloat(style.marginLeft);
        parentOffset.top += parseFloat(parentStyle.borderTopWidth);
        parentOffset.left += parseFloat(parentStyle.borderLeftWidth);
        return {
            top: offset.top - parentOffset.top,
            left: offset.left - parentOffset.left
        };
    }
    hide() {return this.each((i, el) => el.style.display = "none");}
    show(inline) {
        return this.each((i, el) => {
            el.style.display = inline ? "inline-block" : "block";
            el.style.visibility = "visible";
        });
    }
    fadeIn(t, callback) {
        if (!callback) {callback = t;t = 400;}
        return this.animate({
            visibility: 'visible',
            opacity: 1,
            duration: t
        }, function() {
            if (callback) callback.apply(this, arguments);
        });
    }
    fadeOut(t, callback) {
        if (!callback) {callback = t;t = 400;}
        let self = this;
        return this.animate({
            visibility: 'visible',
            duration: t,
            opacity: 0
        }, function() {
            self.css({visibility: 'hidden'}); //can do width: '0px',height: '0px' for display:'none' style
            if (callback) callback.apply(this, arguments);
        });
    }
    innerWidth() {
        return (this[0] || {}).offsetWidth;
    }
    innerHeight() {
        return (this[0] || {}).offsetHeight;
    }
    width(val) {
        if (val) {
            if (!isNaN(val)) val = val + "px";
            this.css('width', val);
            return this;
        }
        if (this[0] === window) return window.innerWidth;
        if (this[0] === document) {
            const   body = document.body,
                    html = document.documentElement;
            return Math.max( body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth );
        }
        let ret = parseFloat(getComputedStyle(this[0]).width);
        if (isNaN(ret)) ret = (this[0] || {}).offsetWidth;
        return ret;
    }
    height(val) {
        if (val) {
            if (!isNaN(val)) val = val + "px";
            this.css('height', val);
            return this;
        }
        if (this[0] === window) return window.innerHeight;
        if (this[0] === document) {
            const   body = document.body,
                    html = document.documentElement;
            return Math.max( body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight );
        }
        let ret = parseFloat(getComputedStyle(this[0]).height);
        if (isNaN(ret)) ret = (this[0] || {}).offsetHeight;
        return ret;
    }
    outerWidth(includeMargin = false) {
        let width = this[0].offsetWidth;
        if (includeMargin) {
            let style = getComputedStyle(this[0]);
            width += parseInt(style.marginLeft) + parseInt(style.marginRight);
        }
        return width;
    }
    outerHeight(includeMargin = false) {
        let height = this[0].offsetHeight;
        if (includeMargin) {
            let style = getComputedStyle(this[0]);
            height += parseInt(style.marginTop) + parseInt(style.marginBottom);
        }
        return height;
    }
    stop() {return this;}
    animate(...a) {
        a = slice.call(a);a[4] = true;
        return this.css.apply(this, a);
    }
    css(...a) {/* .css(rule, val, csscallback),
                  .css(rules),
                  .css(rules, cssCallback);
                  -------------------------a[4] = true; for animations
                  .animate(rules, duration),
                  .animate(rules, callback),
                  .animate(rules, duration, callback),
                  .animate(rules, duration, easing, callback); */
       let rules = a[0], isAnim = a[4], //shared args
           val, cssCallback,            //.css() args
           duration, easing, callback;  //.animate() jQuery arg
        if (isAnim) {
            a = slice.call(a);
            function argByType(haystack, type, instance = 1) {
                let t = 0;
                return haystack.filter((arg, i) => {
                    arg = [arg, i];
                    if (typeof arg[0] === type && ++t === instance) return true;
                    return null;
                });
            }
            duration = argByType(a, 'number')[0] || 1000;
            easing = argByType(a, 'string')[0] || 'ease-in-out';
            callback = argByType(a, 'function')[0] || argByType(a, 'object', 2)[0];
            if (callback) {
                if (callback.duration) duration = callback.duration;
                if (callback.complete) callback = callback.complete;
                if (callback.duration && !callback.complete) callback = function() {};
            }
            a.splice(4, 1); //remove isAnim
            a[1] = undefined;
            a[2] = callback; //cssCallback = callback
        }
        val = a[1];cssCallback = a[2];
        if (!this.length) return (a.length === 1 && typeof rules === 'string') ? undefined : this;
        if (cssCallback || typeof val === "function" || duration) { //cssCallback for animation
            cssCallback = cssCallback || val;
            if (rules === "animation" || rules.animation) {
                this.one('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', cssCallback);
            } else if (rules === "transition" || rules.transition) {
                this.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', cssCallback);
            } else { //animate->css callback()
                let oldTrans = [];
                this.each((i, el) => oldTrans.push(el.style.transition));
                let calledFn = false;
                this.css('transition', 'all ' + duration + 'ms ' + easing, () => {
                    if (calledFn) return;
                    this.each((i, el) => {
                        el.style.transition = oldTrans[i];
                        if (cssCallback) cssCallback.call(el, el);
                    });
                    calledFn = true;
                });
                return setTimeout(() => this.css(rules), 0); //w/o this, transition isn't called immediately after
            }
            if (!a[2]) val = undefined;
        }
        function setCSS(el, rule, val, skip) {
            el.style[rule] = val;
            if (skip) return; //avoids using .startsWith twice, needlessly, in case that affects performance???
            if (rule.startsWith('transition') || rule.startsWith('animation')) {
                setCSS(el, '-webkit-' + rule, val, 1);
                setCSS(el, '-moz-' + rule, val, 1);
                setCSS(el, '-o-' + rule, val, 1);
                setCSS(el, '-ms-' + rule, val, 1);
            }
        }
        if (val) return this.each((i, el) => setCSS(el, rules, val));
        if (typeof rules === "string") return getComputedStyle(this.res[0])[rules];
        return this.each((i, el) => {
            if (!el.style) return;
            for (let rule in rules) setCSS(el, rule, rules[rule]);
        });
    }
    scrollTop(val) {
       if (val) return this.each((i, el) => el.scrollTo(el.scrollLeft, val));
        if (!val) return this.attr('scrollTop', val);
    }
    scrollLeft(val) {
        if (val) return this.each((i, el) => el.scrollTo(val, el.scrollTop));
        if (!val) return this.attr('scrollLeft', val);
    }
    toggleClass(className, state) {
        function ie9_plus_toggle(el, className) {
            if (el.classList) el.classList.toggle(className);
            else {
                let classes = el.className.split(' ');
                let existingIndex = classes.indexOf(className);
                if (existingIndex >= 0) classes.splice(existingIndex, 1); else classes.push(className);
                el.className = classes.join(' ');
            }
        }
        if (state !== undefined) return state ? this.addClass(className) : this.removeClass(className);
        else return this.each((i, el) => ie9_plus_toggle(el, className));
    }
    one(...a) {return fn.ev(this, a, "one");}
    on(...a) {return fn.ev(this, a, "on");}
    off(...a) {return fn.ev(this, a, "off");}
    focus(...a) {return fn.ev(this, a, "focus");}
    blur(...a) {return fn.ev(this, a, "blur");}
    click(...a) {return fn.ev(this, a, "click");}
    dblclick(...a) {return fn.ev(this, a, "dblclick");}
    mousedown(...a) {return fn.ev(this, a, "mousedown");}
    mouseup(...a) {return fn.ev(this, a, "mouseup");}
    mouseenter(...a) {return fn.ev(this, a, "mouseenter");}
    mouseleave(...a) {return fn.ev(this, a, "mouseleave");}
    keypress(...a) {return fn.ev(this, a, "keypress");}
    keydown(...a) {return fn.ev(this, a, "keydown");}
    keyup(...a) {return fn.ev(this, a, "keyup");}
    change(...a) {return fn.ev(this, a, "change");}
    resize(...a) {return fn.ev(this, a, "resize");}
    load(...a) {return fn.ev(this, a, "load");}
    unload(...a) {return fn.ev(this, a, "unload");}
    scroll(...a) {return fn.ev(this, a, "scroll");}
    submit(...a) {return fn.ev(this, a, "submit");}
    trigger(ev) {
        let evt = document.createEvent('HTMLEvents');
        evt.initEvent(ev, true, true);
        return this.each((i, el) => el.dispatchEvent ? el.dispatchEvent(evt) : 0);
    }
    event() {
        //args =  str    str   str      fn        bool
        //args = ["on",  ev,   sel,   handler,   bubble]
        //args = [ 0,    1,    2,     2 || 3,    3 || 4]
        let arg = arguments, ev = arg[0];
        if (["on", "off", "one"].indexOf(ev) !== -1) {
            if (typeof arg[2] === "function") {
                arg[4] = arg[3];
                arg[3] = arg[2];
                arg[2] = undefined;
            }
            let evts = arg[1], callback = arg[3];
            callback.guid = callback.guid || window.guid++;
            evts = evts.split(" ");
            this.each((i, el) => evts.forEach(evt => fn[ev === "off" ? "off" : "on"](el, evt, arg[2], callback, arg[4], (ev === "one"))));
        } else { //listener w/o selector (ie.click() .focus()) OR trigger()
            if (!arg[1]) { //trigger
                this.trigger(ev);
            } else this.each((i, el) => fn.on(el, ev, undefined, arg[1], arg[2]));
        }
        return this;
    }
}

export const fn  = selector => new FrankenQuery(selector);
for (let i in helpers) fn[i] = helpers[i];
if (!window.$) window.$ = fn;