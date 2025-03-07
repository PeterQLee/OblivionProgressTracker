# Proof of concept interactive website for Oblivion 100% speedrun

# Installation
To run locally:
1. Install python3
2. Download files + unzip
3. in root directory (the one with index.html), run python ./server.py 9000
4. in web browser, go to localhost:9000 to view

# Contributing
The codebase is simple js+html


## Adding interactive elements to speedrun page:
Major one is \<span class="npc">foo\</span>.
This will replace foo with a link to the npc with the name "foo".
If that doesn't work, you can specify a clid parameter with the NPC's formID.
For example, the book [Thief] would be class="book" clid="0x000243CA".

# JSON file format
JSON data is in a tree structure.

## Common properties
Common to all nodes. All are optional.
- "name": display name.
- "elements": list of child elements of this node.
- "weight": weight of this tree in progress calculation.
- "extraColumn": name of field to display as an extra column for this subtree.

## Root node (aka "hive")
### Required parameters:
- "version": version of the json data. Each new version has additional required fields or layout. current is 4, which this describes.
- "classname": name of the class of the json tree. used to grab additional files and do stuff. Singular, not plural ("quest", not "quests")

## Leaf node (aka "cell")
### Optional parameters:
- "id": must be a number. Number to save progress of this node to. Preferably sequential, but not required. if its too large (>1000), the save might become too large and cookies might break. if ID is not included, the element will not be saved.
- "formId": formId of this element. Sometimes it is baseID, sometimes refID. Used as primary key so it'll be the same for other websites.
- "link": overrides the default UESP link with a different one.
- "notes": will show a warning symbol next to the item with mouseover text.
- "type": change the HTML input type from checkbox to something else. E.g. "type":"number" for save numbers or number of places discovered.
- "max": Important for progress calculation. for type:number elements, determines the max value. for tree elements, any subtotal above this amount will be ignored. for "ref" cells, scales completion of reference cell to this much.
- "ref": get the value for this cell from a different cell with the target formId.


# Adding Screenshots
Screenshots should be taken from the maximum distance at which you can interact with the object. They must be saved as webp and be <= 200 KiB. (a quality setting of 80-90 is about 200 kib if you don't want to fiddle with each image)

# License
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
