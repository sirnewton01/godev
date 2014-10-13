/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
	"eslint",
	"orion/objects",
	"javascript/astManager",
	"javascript/finder"
], function(eslint, Objects, ASTManager, Finder) {
	// Should have a better way of keeping this up-to-date with ./load-rules-async.js
	var config = {
		// 0:off, 1:warning, 2:error
		rules: {
			"curly" : 0, //$NON-NLS-0$
			"eqeqeq": 1, //$NON-NLS-0$
			"missing-doc": [1, {decl: 0, expr: 0}], //$NON-NLS-0$
			"new-parens" : 1, //$NON-NLS-0$
			"no-debugger" : 1, //$NON-NLS-0$
			"no-dupe-keys" : 2, //$NON-NLS-0$
			"no-eval" : 0, //$NON-NLS-0$
			"no-extra-semi": 1, //$NON-NLS-0$
			'no-jslint' : 1,  //$NON-NLS-0$
			"no-new-array": 1, //$NON-NLS-0$
			"no-new-func": 1, //$NON-NLS-0$
			"no-new-object": 1, //$NON-NLS-0$
			"no-new-wrappers": 1, //$NON-NLS-0$
			"no-redeclare": 1, //$NON-NLS-0$
			"no-undef": 2, //$NON-NLS-0$
			"no-unused-params": 1, //$NON-NLS-0$
			"no-unused-vars": 1, //$NON-NLS-0$
			"no-use-before-define": 1, //$NON-NLS-0$
			"semi": 1, //$NON-NLS-0$
			"throw-error": 1, //$NON-NLS-0$
			"use-isnan" : 2, //$NON-NLS-0$
			'no-unreachable': 2,  //$NON-NLS-0$
			'no-fallthrough' : 2,  //$NON-NLS-0$
			'no-empty-block' : 0  //$NON-NLS-0$
		},
		/**
		 * @description Sets the given rule to the given enabled value
		 * @function
		 * @private
		 * @param {String} ruleId The id of the rule to change
		 * @param {Number} value The value to set the rule to
		 * @param {Object} [key] Optional key to use for complex rule configuration.
		 */
		setOption: function(ruleId, value, key) {
			if (typeof value === "number") {
				if(Array.isArray(this.rules[ruleId])) {
					var ruleConfig = this.rules[ruleId];
					if (key) {
						ruleConfig[1] = ruleConfig[1] || {};
						ruleConfig[1][key] = value;
					} else {
						ruleConfig[0] = value;
					}
				}
				else {
					this.rules[ruleId] = value;
				}
			}
		}
	};

	/**
	 * @description Creates a new ESLintValidator
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager The AST manager backing this validator
	 * @returns {ESLintValidator} Returns a new validator
	 */
	function ESLintValidator(astManager) {
		this.astManager = astManager;
	}
	
	/**
	 * @description Converts the configuration rule value to an eslint string. One of 'warning', 'error', 'ignore'
	 * @public
	 * @param {Object} prob The problem object
	 * @returns {String} the severity string
	 */
	function getSeverity(prob) {
		var val = 2;
		var ruleConfig = config.rules[prob.ruleId];
		if(Array.isArray(ruleConfig)) {
			// Hack for missing-doc which overloads the prob.related object to expose which subrule
			// generated the problem
			var related = prob.related, ruleType = related && related.type;
			if (prob.ruleId === "missing-doc" && ruleConfig[1][ruleType] !== undefined) {
				val = ruleConfig[1][ruleType];
			} else {
				val = ruleConfig[0];
			}
		}
		else {
			val = ruleConfig;
		}
		switch (val) {
			case 1: return "warning"; //$NON-NLS-0$
			case 2: return "error"; //$NON-NLS-0$
		}
		return "error"; //$NON-NLS-0$
	}
	
	/**
	 * @description Converts an eslint / esprima problem object to an Orion problem object
	 * @public
	 * @param {eslint.Error|esprima.Error} e Either an eslint error or an esprima parse error.
	 * @returns {Object} Orion Problem object
	 */
	function toProblem(e) {
		var start = e.start, end = e.end;
		if (e.node) {
			// Error produced by eslint
			start = e.node.range[0];
			end = e.node.range[1];
			if (e.related && e.related.range) {
				// Flagging the entire node is distracting. Just flag the bad token.
				var relatedToken = e.related;
				start = relatedToken.range[0];
				end = relatedToken.range[1];
			}
		}
		var prob = {
		    descriptionKey: (e.args && e.args.nls ? e.args.nls : e.ruleId),
		    descriptionArgs: e.args,
			description: e.message,
			severity: getSeverity(e),
		};
		if(typeof(start) !== 'undefined') {
		    prob.start = start;
		    prob.end = end;
		} else if(typeof(e.lineNumber) !== 'undefined') {
		    prob.line = e.lineNumber;
		    prob.start = e.column;
		} else {
		    prob.start = 0;
		    prob.end = 0;
		}
		if(e.opts && e.opts.args) {
		    prob.problemArgs = e.opts.args;
		}
		return prob;
	}

	Objects.mixin(ESLintValidator.prototype, {
		/**
		 * @description Extracts any errors captured by the tolerant Esprima parser and returns them
		 * @function
		 * @private
		 * @param {esprima.AST} ast The AST
		 * @returns {esprima.Error[]} The array of AST errors (if any)
		 */
		_extractParseErrors: function(ast) {
			var errors = [], errorMap = Object.create(null);
			var asterrors = ast.errors;
			if(asterrors) {
				var len = asterrors.length;
				for(var i = 0; i < len; i++) {
					var error = asterrors[i];
					var token = null;
					if(error.end && error.token) {
						token = {range: [error.index, error.end], value: error.token};
					}
					else if(ast.tokens.length > 0) {
						//error object did not contain the token infos, try to find it
						token = Finder.findToken(error.index, ast.tokens);	
					}
					var msg = error.message;
					if(errorMap[error.index] === msg) {
						continue;
					}
					errorMap[error.index] = msg;
					if(error.type) {
						switch(error.type) {
							case ASTManager.ErrorTypes.Unexpected:
							    if(token) {
    								error.args = {0: token.value, nls: "syntaxErrorBadToken"}; //$NON-NLS-0$
    								error.message = msg = error.args.nls;
								}
								break;
							case ASTManager.ErrorTypes.EndOfInput:
								error.args = {nls: "syntaxErrorIncomplete"}; //$NON-NLS-0$
								error.message = error.args.nls;
								break;
						}
					} else if(!token) {
					    //an untyped error with no tokens, report the failure
					    error.args = {0: error.message, nls: 'esprimaParseFailure'};
					    error.message = error.args.nls;
					    //use the line number / column
				       delete error.start;
				       delete error.end;
					}
					if(token) {
					   error.node = token;
					}
					errors.push(error);
				}
			}
			return errors;
		},
		/**
		 * @description Callback to create problems from orion.edit.validator
		 * @function
		 * @public
		 * @param {orion.edit.EditorContext} editorContext The editor context
		 * @param {Object} context The in-editor context (selection, offset, etc)
		 * @returns {orion.Promise} A promise to compute some problems
		 */
		computeProblems: function(editorContext, context) {
			var _self = this;
			switch(context.contentType) {
				case 'text/html': //$NON-NLS-0$
					return editorContext.getText().then(function(text) {
						var blocks = Finder.findScriptBlocks(text);
						var len = blocks.length;
						var allproblems = [];
						for(var i = 0; i < len; i++) {
							//we don't want to cache these ASTs so call into the private parse method of the manager
							var block = blocks[i];
							var ast = _self.astManager.parse(block.text);
							var problems = _self._validateAst(ast).problems;
							var len2 = problems.length;
							for(var j = 0; j < len2; j++) {
								//patch the start of the problem for the script block offset
								problems[j].start += block.offset; 
								problems[j].end += block.offset; 
							}
							allproblems = allproblems.concat(problems);
						}
						return {problems: allproblems};
					});
				case 'application/javascript': //$NON-NLS-0$
					return this.astManager.getAST(editorContext).then(function(ast) {
						return _self._validateAst(ast);
					});
			}
		},
		
		/**
		 * @description Validates the given AST
		 * @function
		 * @private
		 * @param {Object} ast The AST
		 * @returns {Array|Object} The array of problem objects
		 * @since 6.0
		 */
		_validateAst: function(ast) {
			var eslintErrors = [], 
				parseErrors = this._extractParseErrors(ast);
			try {
				eslintErrors = eslint.verify(ast, config);
			} catch (e) {
				if(parseErrors.length < 1) {
					eslintErrors.push({
						start: 0,
						args: {0: e.toString(), nls: "eslintValidationFailure" }, //$NON-NLS-0$
						severity: "error" //$NON-NLS-0$
					});
				}
			}
			return { problems: this._filterProblems(parseErrors, eslintErrors).map(toProblem) };
		},
		
		/**
		 * @description Post-processes the ESLint generated problems to determine if there are any linting issues reported for the same 
		 * nodes as parse errors. If there are we discard those problems.
		 * @function
		 * @private
		 * @param {Array} parseErrors The array of parse errors, never <code>null</code>
		 * @param {Array} eslintErrors The array of eslint computed errors, never <code>null</code>
		 * @returns {Array} The filtered list of errors to report to the editor
		 * @since 6.0
		 */
		_filterProblems: function(parseErrors, eslintErrors) {
			var len = parseErrors.length;
			if(len < 1) {
				return eslintErrors;
			}
			var filtered = [].concat(parseErrors);
			var len2 = eslintErrors.length;
			filter: for(var i = 0; i < len2; i++) {
				var ee = eslintErrors[i];
				for(var j = 0; j < len; j++) {
					var pe = parseErrors[j];
					var node = ee.node;
					if(node && node.range[0] >= pe.index && node.range[0] <= pe.end) {
						continue filter;
					}
				}
				filtered.push(ee);
			}
			return filtered;
		},
		
		/**
		 * @description Callback from orion.cm.managedservice
		 * @function
		 * @public
		 * @param {Object} properties The properties that have been changed
		 */
		updated: function(properties) {
			if (!properties) {
				return;
			}
			// TODO these option -> setting mappings are becoming hard to manage
			// And they must be kept in sync with javascriptPlugin.js
			config.setOption("curly", properties.validate_curly); //$NON-NLS-0$
			config.setOption("eqeqeq", properties.validate_eqeqeq); //$NON-NLS-0$
			config.setOption("missing-doc", properties.validate_func_decl, "decl"); //$NON-NLS-0$ // missing-func-decl-doc
			config.setOption("missing-doc", properties.validate_func_expr, "expr"); //$NON-NLS-0$ // missing-func-expr-doc
			config.setOption("new-parens", properties.validate_new_parens); //$NON-NLS-0$
			config.setOption("no-debugger", properties.validate_debugger); //$NON-NLS-0$
			config.setOption("no-dupe-keys", properties.validate_dupe_obj_keys); //$NON-NLS-0$
			config.setOption("no-eval", properties.validate_eval); //$NON-NLS-0$
			config.setOption("no-extra-semi", properties.validate_unnecessary_semi); //$NON-NLS-0$
			config.setOption("no-new-array", properties["no-new-array"]); //$NON-NLS-1$ //$NON-NLS-0$
			config.setOption("no-new-func", properties["no-new-func"]); //$NON-NLS-1$ //$NON-NLS-0$
			config.setOption("no-new-object", properties["no-new-object"]); //$NON-NLS-1$ //$NON-NLS-0$
			config.setOption("no-new-wrappers", properties["no-new-wrappers"]); //$NON-NLS-1$ //$NON-NLS-0$
			config.setOption("no-redeclare", properties.validate_no_redeclare); //$NON-NLS-0$
			config.setOption("no-undef", properties.validate_no_undef); //$NON-NLS-0$
			config.setOption("no-unused-params", properties.validate_unused_params); //$NON-NLS-0$
			config.setOption("no-unused-vars", properties.validate_no_unused_vars); //$NON-NLS-0$
			config.setOption("no-use-before-define", properties.validate_use_before_define); //$NON-NLS-0$
			config.setOption("semi", properties.validate_missing_semi); //$NON-NLS-0$
			config.setOption("throw-error", properties.validate_throw_error); //$NON-NLS-0$
			config.setOption("use-isnan", properties.validate_use_isnan); //$NON-NLS-0$
			config.setOption("no-unreachable", properties.validate_no_unreachable); //$NON-NLS-0$
			config.setOption("no-fallthrough", properties.validate_no_fallthrough); //$NON-NLS-0$
			config.setOption("no-jslint", properties.validate_no_jslint); //$NON-NLS-0$
			config.setOption("no-empty-block", properties.validate_no_empty_block); //$NON-NLS-0$
		}
	});
	return ESLintValidator;
});
