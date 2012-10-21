// utilize esprima for tag generating

/*jshint node*/

var esprima = require('esprima');

var exports = module.exports;

// shadow copying
function _copy(dest, src) {
    for (var key in src) {
        if (!dest[key]) {
            dest[key] = src[key];
        }
    }

    return dest;
}

function getType(o) {
    var toS = Object.prototype.toString;
    if (toS.call(o) === '[object Array]')
        return 'array';
    else if (toS.call(o) === '[object Object]')
        return 'object';
    else
        return typeof o;
}

exports.parse = function(code, opts) {
    opts = opts || {};
    if (!('loc' in opts)) {
        opts.loc = true;
    }

    return new Jstag(esprima.parse(code, opts));
};

function Jstag(ast) {
    Object.defineProperty(this, 'ast', {
        value: ast
    });

    this._root = {
        'name': '',
        'type': 'Program'
    };
    this._traverseAst(this.ast.body, this._root);
}

Jstag.prototype.find = function(funcname) {
    var ret = null;

    this._visit(this._root, function(node) {
        if (node.type === 'function') {
            ret = node;
            return true;
        }
        return false;
    });

    return ret;
};

// callback(node, context)
Jstag.prototype._visit = function(node, callback) {
    function visitContext(node, ctx) {
        if (callback(node, ctx)) {
            return true;
        }

        if (node.children) {
            var clds = node.children,
                len = clds.length;

            if (node.type === 'function') {
                ctx.push(node.name);
            }

            for (var i = 0; i < len; i++) {
                if (visitContext(clds[i], ctx, callback)) {
                    return true;
                }
            }

            ctx.pop();
        }

        return false;
    }

    return visitContext(this._root, [], callback);
};

Jstag.prototype._traverseAst = function(ast, container) {
    container.children = container.children || [];
    var clds = container.children,
        kind,
        subContainer,
        self = this;

    if (getType(ast) === 'array') {
        ast.forEach(function(node) {
            self._traverseAst(node, container);
        });

    } else if (getType(ast) === 'object') {
        for (var key in ast) {
            if (key === 'type') {
                if ( ast[key] === 'VariableDeclaration') {
                    ast.declarations.forEach(function(declarator) {
                        if (declarator.init && declarator.init.type === 'FunctionExpression') {
                            kind = 'function';
                        } else {
                            kind = 'variable';
                        }

                        subContainer = {
                            'name': declarator.id.name,
                            'type': kind,
                            'loc': declarator.loc
                        };
                        clds.push(subContainer);

                        if (kind === 'function') {
                            self._traverseAst(declarator.init.body.body, subContainer);
                        }
                    });

                } else if (ast[key] === 'FunctionDeclaration') {
                    subContainer = {
                        'name': ast.id.name,
                        'type': 'function',
                        'loc': ast.loc
                    };
                    clds.push(subContainer);

                    self._traverseAst(ast.body.body, subContainer);

                } else if (ast[key] === 'AssignmentExpression') {
                    if (ast.operator !== '=') {
                        continue;
                    }

                    if (ast.left.type !== 'MemberExpression') {
                        continue;
                    }

                    //TODO: extract object members and check if defined or not

                } else if (ast[key] === 'ExpressionStatement') {
                    var expr = ast.expression;
                    if (expr.type === 'AssignmentExpression') {
                        //TODO: OMG, this is hard, need to know if identifier already defined or not.
                        if (expr.operator !== '=') {
                            continue;
                        }

                        //if defined(expr.left.name)
                    }
                }
            }
        }
    }
};

Jstag.prototype.functions = function() {
    var collect = [];

    this._visit(this._root, function(node, ctx) {
        if (node.type === 'function') {
            var obj = _copy({}, node);
            obj.children && delete obj.children;

            var ctx2 = _copy([], ctx);
            ctx2.push(obj.name);
            obj.ctx = ctx2.join('.');
            collect.push(obj);
        }
        return false;
    });

    this.functions = function() { return collect; };
    return collect;
};

Jstag.prototype.definitions = function() {
    var collect = [];

    this._visit(this._root, function(node, ctx) {
        if (node.type === 'variable') {
            var obj = _copy({}, node);
            obj.children && delete obj.children;

            var ctx2 = _copy([], ctx);
            ctx2.push(obj.name);
            obj.ctx = ctx2.join('.');
            collect.push(obj);
        }
        return false;
    });

    this.definitions = function() { return collect; };
    return collect;
};
