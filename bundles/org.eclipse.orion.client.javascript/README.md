**Orion JavaScript Tools** are a suite of tools to help JavaScript developers write better code. Faster.

# Features

### Content Assist

Need some help while coding? Activate content assist for code completions, keywords and templates.

Content assist can be easily extended to understand 3rd party libraries and comes preconfigured for 
**Browser**, **Node.js**, **MongoDB**, **Redis**, **MySQL** and more!

To activate the libraries in your source simply add a stanza at the top of your source indicating which library to use.

For example to use **Node.js** we would add the following:
```javascript
/* node:true */
```

### Customizable Linting

Backed by the power and speed of [ESLint](https://github.com/eslint/eslint), the linting rules in Orion can be configured on a per-rule basis. 

Don't like being nagged about unused parameters? Simply turn it off in the easy to use preference dialog.

### Mark Occurrences

Turn this editor option on to find all relevant occurrences of the selected token. 

Currently finds occurrrences of identifiers, function declarations and correctly-scoped this usage.

### Source Outline

Using the super convenient **Ctrl+O** keybinding (or the **View** menu) you can view an outline of your source. Clicking outline elements 
takes you to the relevant position in the source.

# Contributing

Contributing code to the JavaScript project follows the general rules for Orion, which can
be found on the [Orion contributing code](https://wiki.eclipse.org/Orion/Contributing_Code) wiki.

# License

The Eclipse Foundation makes available all content in this plug-in (&quot;Content&quot;).  Unless otherwise 
indicated below, the Content is provided to you under the terms and conditions of the
[Eclipse Public License Version 1.0](http://www.eclipse.org/legal/epl-v10.html)
(&quot;EPL&quot;), and the [Eclipse Distribution License Version 1.0](http://www.eclipse.org/org/documents/edl-v10.html) 
(&quot;EDL&quot;). For purposes of the EPL and EDL, &quot;Program&quot; will mean the Content.
		
If you did not receive this Content directly from the Eclipse Foundation, the Content is 
being redistributed by another party (&quot;Redistributor&quot;) and different terms and conditions may
apply to your use of any object code in the Content.  Check the Redistributor's license that was 
provided with the Content.  If no such license exists, contact the Redistributor.  Unless otherwise
indicated below, the terms and conditions of the EPL still apply to any source code in the Content
and such source code may be obtained at [http://www.eclipse.org](http://www.eclipse.org/).
