Orion Release Notes for R3.0
============================

Orion 3.0 is to be released at the end of June, 2013 in concert with the Eclipse Kepler Release Train.  These notes are to record any anomolies which a user might encounter that could impact behaviour but have a workaround or expected outcome.

* A search on Orion has a limitation of "Whole word" option for DBCS characters [Bug 407258](https://bugs.eclipse.org/bugs/show_bug.cgi?id=407258 "Bug 407258"). This bug is based on a limitation of JavaScript that is not Unicode-aware.
* [Depending on Bug 381986](https://bugs.eclipse.org/bugs/show_bug.cgi?id=381986 "Bug 381986") Navigator has a limitation on Safari 6 on Mac about opening file whose path (folder and file name) contains DBCS characters.  
* [Chrome] On the UI Theme page in settings, occassionly the circles for the guide or the colour palette do not draw - restart Chrome if you want to see them
