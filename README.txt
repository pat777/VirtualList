The Ext.ux.VirtualList control is a specialized Ext.List control which provides support for
large data sets.

It has been build upon Sencha Touch Version 1.1.1. The code is partly based on 
Ext.ux.BufferedList (especially index/group handling) implemented by Scott Borduin
and the community in Sencha Touch forum (see 
https://github.com/Lioarlan/UxBufList-Sench-Touch-Extension for details).

This component started as an educational project. I needed a List Control for a project which
handles many items as smooth as possible and I wanted to learn about Sencha Touch component
development - the available components in the internet were not usable for my project, so I just
started to design and implement my own version of a Sencha Touch List component which suited perfectly
to the needs of my project. Since the control turned out to be more as an "educational project" I
decided to share it with the community (maybe someone out there considers the component useful too).

The control just renders a maximum of containerMaxItemCount * 3 items at any time. It is a very
lightweight control and some features are intentionally left out for the first version:

- the selection is not persistent
- multiple selection is not available
- group headers are not available
- ...

It is pretty important to set the config parameter defaultItemHeight to the correct pixel 
height of items in the list. You can just set it to the same height as .x-list-item
CSS style.

Hope you enjoy this control! Please let me know if you encounter any issues/bugs.

Patrick Derichs

(Thanks go out to Scott Borduin and the other developers/maintainers of Ext.ux.BufferedList: Your code
really helped me to get started! ;-) )