# PlayCanvas Editor Plus

A set of extensions for the PlayCanvas editor.  Implemented as a Google Chrome extension.

## Features

* Colour model view in the assets panel and preview window (no more grey shadows!)
* See whole of asset name in the asset panel
* Bake together meshes to reduce draw calls and improve performance
* Quickly select the Root node and collapse others
* Quickly select the parent of an entity
* Powerful search with RegEx, supports component names, entity names etc and returns all matches (unlike the normal hierarchy search)
* Drop to root - enables items being dropped from the asset panel to be located at the position of the selected entity but then parented to the root - stops accidental creation of complicated deep structures when designing scenes
* Snap to grid - snaps one or more entities that are already in the scene to the current grid interval - normal snapping in PlayCanvas does not round the existing position, but only move
 items it by grid increments.
* Snap Rotation - snaps the Y rotation of one or more entities to a 90 degree increment. Useful for laying out levels.  


## Installation

Clone the repo and run `npm install` in the root folder.

## Usage

*For developing extensions to the plugin use:*

1. Use ***chrome://extensions*** in developer mode and "Load Unpacked Extension" in the **chrome-extension** folder. 
2. run `npm start` in the root folder to start a webpack dev server which will serve the plugin files
3. You will have to approve the self certified HTTPS server next. In a browser open ***https://localhost:8081/main.build.js*** and use the advanced
tab to proceed to localhost.

*If you just want to use the plugin:*

Use ***chrome://extensions*** in developer mode and "Load Unpacked Extension" in the **production-extension** folder

*In other browsers:*

Host or otherwise insert the **production-extension/main.fn.build.js** into the editor 
page and call `_inject()` or build the project insert **build/main.build.js** into the page.

## Keyboard Shortcuts

The plugin adds some shortcut keys:

**T** - snap the current entity or entities to the snap increment

**R** - select the root scene node (collapsing others)

**U** - select the parent of the current entity (or the first entity selected)

**G** - activate the search window

## Baking Meshes

The plugin allows you to bake together meshes to save draw calls and improve performance.

You select one or more entities in the tree and then they and their children are combined based
on the materials used in their meshes.

A new asset is added to the project with the baked mesh and an entity is added to the
scene which uses this mesh.  Existing entities that were baked are disabled.

Baking can take a while and the resulting model is automatically imported into
PlayCanvas but this may take a while.

You can specify options for the resulting meshes - for instance their lightmapping
and shadow settings.  You can also choose to ignore meshes with more than a 
vertex limit you specify. You get the biggest performance improvements when you
bake many meshes with few vertices, but you can also leave this option turned off if
you prefer and just bake everything.

There is a limit on the number of vertices in a mesh of 62,000.  If the number of
vertices exceeds this a second mesh is automatically created and added as a 
further mesh instance.  This process is repeated so there is no practical limit.

### Downsides of baking

Baking meshes may end up messing with culling and having more triangles drawn than if
they weren't baked.  This is a CPU/GPU balancing issue.  In general I pretty much
always bake meshes for static items, but you should be aware that this may 
significantly increase the number of triangles rendered and assess yourself whether
your application is GPU or CPU bound.

## Searching

The search tool searches entities in the current scene.  You can use regular expressions for searches.

The entities are searched by name, components attached and the names of scripts.  If
you need to differentiate between them then you can prepend a special character - but
this must then be followed by the start of the name, script or component.

* **:** Name of the entity. *e.g. :player*
* **=** Name of the component. *e.g. =collision*
* **#** Name of the script. *e.g. #follow*

### History

v1.1

* Added Bake for meshes
* Improved selectivity of search terms with # : and =
* Added a checkbox to specify search scope
* Search has a hot key and reacts to ENTER 
 
