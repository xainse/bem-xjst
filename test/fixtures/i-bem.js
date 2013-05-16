module.exports = function() {

xjst$oninit(function(exports) {

var BEM_ = {},
    toString = Object.prototype.toString,
    SHORT_TAGS = { // хэш для быстрого определения, является ли тэг коротким
        area : 1, base : 1, br : 1, col : 1, command : 1, embed : 1, hr : 1, img : 1,
        input : 1, keygen : 1, link : 1, meta : 1, param : 1, source : 1, wbr : 1 };

/** @fileOverview - module for internal BEM helpers */
/** @requires BEM */

(function(BEM, undefined) {

/**
 * Separator for modifiers and their values
 * @const
 * @type String
 */
var MOD_DELIM = '_',

/**
 * Separator between block names and a nested element
 * @const
 * @type String
 */
    ELEM_DELIM = '__',

/**
 * Pattern for acceptable names of elements and modifiers
 * @const
 * @type String
 */
    NAME_PATTERN = '[a-zA-Z0-9-]+';

function buildModPostfix(modName, modVal, buffer) {

    buffer.push(MOD_DELIM, modName, MOD_DELIM, modVal);

}

function buildBlockClass(name, modName, modVal, buffer) {

    buffer.push(name);
    modVal && buildModPostfix(modName, modVal, buffer);

}

function buildElemClass(block, name, modName, modVal, buffer) {

    buildBlockClass(block, undefined, undefined, buffer);
    buffer.push(ELEM_DELIM, name);
    modVal && buildModPostfix(modName, modVal, buffer);

}

BEM.INTERNAL = {

    NAME_PATTERN : NAME_PATTERN,

    MOD_DELIM : MOD_DELIM,
    ELEM_DELIM : ELEM_DELIM,

    buildModPostfix : function(modName, modVal, buffer) {

        var res = buffer || [];
        buildModPostfix(modName, modVal, res);
        return buffer? res : res.join('');

    },

    /**
     * Builds the class for a block or element with a modifier
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Element name
     * @param {Array} [buffer] Buffer
     * @returns {String|Array} Class or buffer string (depending on whether the buffer parameter is present)
     */
    buildClass : function(block, elem, modName, modVal, buffer) {

        var typeOf = typeof modName;
        if(typeOf == 'string') {
            if(typeof modVal != 'string') {
                buffer = modVal;
                modVal = modName;
                modName = elem;
                elem = undefined;
            }
        } else if(typeOf != 'undefined') {
            buffer = modName;
            modName = undefined;
        } else if(elem && typeof elem != 'string') {
            buffer = elem;
            elem = undefined;
        }

        if(!(elem || modName || buffer)) { // оптимизация для самого простого случая
            return block;
        }

        var res = buffer || [];

        elem?
            buildElemClass(block, elem, modName, modVal, res) :
            buildBlockClass(block, modName, modVal, res);

        return buffer? res : res.join('');

    },

    /**
     * Builds modifier classes
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifier name
     * @param {Array} [buffer] Buffer
     * @returns {String|Array} Class or buffer string (depending on whether the buffer parameter is present)
     */
    buildModsClasses : function(block, elem, mods, buffer) {

        var res = buffer || [];

        if(mods) {
            var modName; // TODO: разобраться с OmetaJS и YUI Compressor
            for(modName in mods) {
                if(!mods.hasOwnProperty(modName)) continue;

                var modVal = mods[modName];
                if (modVal === null) continue;

                modVal = mods[modName] + '';
                if (!modVal) continue;

                res.push(' ');
                if (elem) {
                  buildElemClass(block, elem, modName, modVal, res)
                } else {
                  buildBlockClass(block, modName, modVal, res);
                }
            }
        }

        return buffer? res : res.join('');

    },

    /**
     * Builds full classes for a block or element with modifiers
     * @private
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifier name
     * @param {Array} [buffer] Buffer
     * @returns {String|Array} Class or buffer string (depending on whether the buffer parameter is present)
     */
    buildClasses : function(block, elem, mods, buffer) {

        var res = buffer || [];

        elem?
            buildElemClass(block, elem, undefined, undefined, res) :
            buildBlockClass(block, undefined, undefined, res);

        this.buildModsClasses(block, elem, mods, buffer);

        return buffer? res : res.join('');

    }

};

})(BEM_);

var buildEscape = (function() {
    var ts = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' },
        f = function(t) { return ts[t] || t };
    return function(r) {
        r = new RegExp(r, 'g');
        return function(s) { return ('' + s).replace(r, f) }
    }
})();

function BEMContext(context, apply_) {
  this.ctx = typeof context === null ? '' : context;
  this.apply = apply_;
  this._buf = [];
  this._ = this;

  // Stub out fields that will be used later
  this._start = true;
  this._mode = '';
  this._listLength = 0;
  this._notNewList = false;
  this.position = 0;
  this.block = undefined;
  this.elem = undefined;
  this.mods = undefined;
  this.elemMods = undefined;
};

BEMContext.prototype.isArray = function isArray(obj) {
    return toString.call(obj) === "[object Array]";
};

BEMContext.prototype.isSimple = function isSimple(obj) {
    var t = typeof obj;
    return t === 'string' || t === 'number' || t === 'boolean';
};

BEMContext.prototype.isShortTag = function isShortTag(t) {
    return SHORT_TAGS.hasOwnProperty(t);
};

BEMContext.prototype.extend = function extend(o1, o2) {
    if(!o1 || !o2) return o1 || o2;
    var res = {}, n;
    for(n in o1) o1.hasOwnProperty(n) && (res[n] = o1[n]);
    for(n in o2) o2.hasOwnProperty(n) && (res[n] = o2[n]);
    return res;
};

BEMContext.prototype.identify = (function() {
    var cnt = 0,
        id = BEM_.__id = (+new Date()),
        expando = '__' + id,
        get = function() { return 'uniq' + id + ++cnt; };
    return function(obj, onlyGet) {
        if(!obj) return get();
        if(onlyGet || obj[expando]) return obj[expando];
        else return (obj[expando] = get());
    };
})();

BEMContext.prototype.xmlEscape = buildEscape('[&<>]');
BEMContext.prototype.attrEscape = buildEscape('["&<>]');

BEMContext.prototype.BEM = BEM_;

BEMContext.prototype.isFirst = function isFirst() {
    return this.position === 1;
};

BEMContext.prototype.isLast = function isLast() {
    return this.position === this._listLength;
};

BEMContext.prototype.generateId = function generateId() {
    return this.identify(this.ctx);
};

var oldApply = exports.apply;

// Wrap xjst's apply and export our own
exports.apply = BEMContext.apply = function _apply() {
    var ctx = new BEMContext(this, oldApply);
    ctx.apply();
    return ctx._buf.join('');
};

});

match(this._mode === '')(
    match()(function() {
        var vBlock = this.ctx.block,
            vElem = this.ctx.elem,
            block = this._currBlock || this.block;

        this.ctx || (this.ctx = {});

        local('default', {
            _links: this.ctx.links || this._links,
            block: vBlock || (vElem ? block : undefined),
            _currBlock: vBlock || vElem ? undefined : block,
            elem: this.ctx.elem,
            mods: (vBlock ? this.ctx.mods : this.mods) || {},
            elemMods: this.ctx.elemMods || {}
        })(function() {
            (this.block || this.elem) ?
                (this.position = (this.position || 0) + 1) :
                this._listLength--;
            apply();
        });
    }),

    match(this._.isArray(this.ctx))(function() {
        var v = this.ctx,
            l = v.length,
            i = 0,
            prevPos = this.position,
            prevNotNewList = this._notNewList;

        if(prevNotNewList) {
            this._listLength += l - 1;
        } else {
            this.position = 0;
            this._listLength = l;
        }

        this._notNewList = true;

        while(i < l) {
            var newCtx = v[i++];
            apply({ ctx: newCtx === null ? '' : newCtx });
        }

        prevNotNewList || (this.position = prevPos);
    }),

    match(!this.ctx)(function() {
        this._listLength--;
    }),

    match(this._.isSimple(this.ctx))(function() {
        this._listLength--;

        var ctx = this.ctx;
        (ctx && ctx !== true || ctx === 0) && this._buf.push(ctx);
    })
);

def()(function() {
    var _this = this,
        BEM_ = _this.BEM,
        v = this.ctx,
        buf = this._buf,
        tag;

    tag = apply('tag');
    typeof tag != 'undefined' || (tag = v.tag);
    typeof tag != 'undefined' || (tag = 'div');

    if(tag) {
        var jsParams, js;
        if(this.block && v.js !== false) {
            js = apply('js');
            js = js? this._.extend(v.js, js === true? {} : js) : v.js === true? {} : v.js;
            js && ((jsParams = {})[BEM_.INTERNAL.buildClass(this.block, v.elem)] = js);
        }

        buf.push('<', tag);

        var isBEM = apply('bem');
        typeof isBEM != 'undefined' || (isBEM = typeof v.bem != 'undefined' ? v.bem : v.block || v.elem);

        var cls = apply('cls');
        cls || (cls = v.cls);

        var addJSInitClass = v.block && jsParams;
        if(isBEM || cls) {
            buf.push(' class="');
            if(isBEM) {

                BEM_.INTERNAL.buildClasses(this.block, v.elem, v.elemMods || v.mods, buf);

                var mix = apply('mix');
                v.mix && (mix = mix? mix.concat(v.mix) : v.mix);

                if(mix) {
                    var visited = {};

                    function visitedKey(block, elem) {
                      return (block || '') + '__' + (elem || '');
                    }

                    visited[visitedKey(this.block, this.elem)] = true;

                    // Transform mix to the single-item array if it's not array
                    if (!this._.isArray(mix)) mix = [mix];
                    for (var i = 0; i < mix.length; i++) {
                        var mixItem = mix[i],
                            hasItem = mixItem.block || mixItem.elem,
                            block = mixItem.block || mixItem._block || _this.block,
                            elem = mixItem.elem || mixItem._elem || _this.elem;

                        hasItem && buf.push(' ');
                        BEM_.INTERNAL[hasItem? 'buildClasses' : 'buildModsClasses'](
                            block,
                            mixItem.elem || mixItem._elem ||
                                (mixItem.block ? undefined : _this.elem),
                            mixItem.elemMods || mixItem.mods,
                            buf);

                        if(mixItem.js) {
                            (jsParams || (jsParams = {}))[BEM_.INTERNAL.buildClass(block, mixItem.elem)] = mixItem.js === true? {} : mixItem.js;
                            addJSInitClass || (addJSInitClass = block && !mixItem.elem);
                        }

                        // Process nested mixes
                        if (hasItem && !visited[visitedKey(block, elem)]) {
                            visited[visitedKey(block, elem)] = true;
                            var nestedMix = apply({
                                    block: block,
                                    elem: elem
                                }, 'mix');

                            if (nestedMix) {
                                for (var j = 0; j < nestedMix.length; j++) {
                                    var nestedItem = nestedMix[j];
                                    if (!nestedItem.block &&
                                        !nestedItem.elem ||
                                        !visited[visitedKey(
                                          nestedItem.block,
                                          nestedItem.elem
                                        )]) {
                                        nestedItem._block = block;
                                        nestedItem._elem = elem;
                                        mix.splice(i + 1, 0, nestedItem);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            cls && buf.push(isBEM? ' ' : '', cls);

            addJSInitClass && buf.push(' i-bem');
            buf.push('"');
        }

        if(jsParams) {
            var jsAttr = apply('jsAttr');
            buf.push(
                ' ', jsAttr || 'onclick', '="return ',
                this._.attrEscape(JSON.stringify(jsParams)),
                '"');
        }

        var attrs = apply('attrs');
        attrs = this._.extend(attrs, v.attrs); // NOTE: возможно стоит делать массив, чтобы потом быстрее сериализовывать
        if(attrs) {
            var name; // TODO: разобраться с OmetaJS и YUI Compressor
            for(name in attrs) {
              if (attrs[name] === undefined) continue;
              buf.push(' ', name, '="', this._.attrEscape(attrs[name]), '"');
            }
        }
    }

    if(this._.isShortTag(tag)) {
        buf.push('/>');
    } else {
        tag && buf.push('>');

        var content = apply('content');
        if(content || content === 0) {
            var isBEM = this.block || this.elem;
            apply('', {
                _notNewList: false,
                position: isBEM ? 1 : this.position,
                _listLength: isBEM ? 1 : this._listLength,
                ctx: content
            });
        }

        tag && buf.push('</', tag, '>');
    }
});

tag()(undefined);
attrs()(undefined);
cls()(undefined);
js()(undefined);
jsAttr()(undefined);
bem()(undefined);
mix()(undefined);
content()(this.ctx.content);

}.toString().replace(/^function\s*\(\)\s*{|}$/g, ''); // module.exports
