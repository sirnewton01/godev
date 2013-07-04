/*jslint browser:true*/
/*global define esprima */
define(['orion/plugin', 'orion/editor/textModel', 'esprima/esprima', 'domReady!'], function(PluginProvider, mTextModel) {
	var provider = new PluginProvider({
		name: 'JS Syntax Model Provider',
		description: 'Constructs an abstract syntax tree (AST) for JavaScript code that can be used by other plugins to provide JS language tooling.',
		version: '1.0'
	});

	var AST_PARSE_INTERVAL = 500;
	var textModel = new mTextModel.TextModel();
	var timeoutId = null;

	var modelProviderService = {
		addEventListener: function() {
			// Dummy function, but must be present for the ServiceRegistry to work its magic
		},
		removeEventListener: function() {
			// Dummy function, but must be present for the ServiceRegistry to work its magic
		},
		dispatchEvent: function(syntaxModel) {
			return {
				contentType: 'application/javascript',
				type: 'orion.edit.syntaxmodel.modelReady',
				syntaxModel: syntaxModel
			};
		}
	};

	function buildAST() {
		var ast = esprima.parse(textModel.getText());
		modelProviderService.dispatchEvent(ast);
	}

	provider.registerService('orion.edit.model', {
			onModelChanging: function(e) {
				// apply to our local text model.
				var end = e.start + e.removedCharCount;
				end = Math.min(end, textModel.getCharCount());
				end = Math.max(end, e.start);
				textModel.setText(e.text, e.start, end);

				clearTimeout(timeoutId);
				timeoutId = setTimeout(buildAST, AST_PARSE_INTERVAL);
			}
		}, {
			contentType: ['application/javascript'],
			types: ['ModelChanging']
		});

	provider.registerService('orion.edit.syntaxmodel.provider', modelProviderService, {
			contentType: ['application/javascript']
		});

	provider.connect();

});