"use strict"

var linkedElements = [];

function LinkedElement(element, classname, id){
	this.htmlElement = element;
	this.classname = classname;
	this.id = id;
}

function init(){
	//preload settings so we can get iframe loaded fast
	window.settings = loadCookie("settings");
	checkIframeSize();
	window.addEventListener("resize",onWindowResize);
	loadJsonData().then(()=>{
		loadProgressFromCookie();
		if(settings.remoteShareCode){
			if(!document.getElementById("spectateBanner")){
				let spectateBanner = document.createElement("SPAN");
				spectateBanner.innerText = "Spectating ⟳";
				spectateBanner.id = "spectateBanner";
				spectateBanner.style.backgroundColor = "#90FF90";
				spectateBanner.title = "last updated "+settings.shareDownloadTime+". Click to refresh."
				spectateBanner.addEventListener("click", function(){
					spectateBanner.innerText = "Reloading...";
					startSpectating(false, true).then(()=>{
						spectateBanner.innerText = "Spectating ⟳";
						spectateBanner.title = "last updated "+settings.shareDownloadTime+". Click to refresh.";
					});
				})
				document.getElementById("topbar").appendChild(spectateBanner);
	
			}
		}
		replaceElements();
	});
}

/**
 * Initial function to replace checkboxes n stuff.
 * 
 * Note: We could search all trees for a match, so if the user got the classname wrong, it'll still work, but
 * I think we'll leave that as an error. Programatically it doesn't matter, but it is simpler and it will
 * helps when you're looking in the html.
 */
function replaceElements(){
	//TODO: incorporate NPC elements in to this general method.
	for(const klass of classes){
		let replaceableParts = Array.of(...document.getElementsByClassName(klass.name));
		for(const element of replaceableParts){
			//step 1: get the target element data.
			var found = false;
			var cell = null;
			var elementid = null;
			const checklistid = element.getAttribute("clid");

			//check in the following order: formid, sequentialid, innerText as name
			if(checklistid?.startsWith("0x")){
				let maybeJson = findCell(checklistid, klass.name);
				if(maybeJson != null){
					elementid = maybeJson.id;
					cell = maybeJson;
					found=true;
				}
			}

			if(!found && checklistid?.startsWith(klass.name)){
				elementid = checklistid.substring(klass.name.length);
				cell = findOnTree(jsondata[klass.name],(x=>x.id == elementid));
				if(cell){found=true;}
			}

			if(!found){
				//element didn't have a formid. search by name.
				//maybe we can look up by name
				let elementType = element?.classList[0];
				if(elementType != null){
					let elementName = element.innerText;

					//sanitize name if possible
					let firstBracketPos = elementName.indexOf("[");
					if(firstBracketPos != -1){
						elementName = elementName.substring(0,firstBracketPos);
					}
					elementName = elementName.trim();

					var maybeCell = findOnTree(jsondata[elementType], x=>x.name?.toLowerCase() == elementName.toLowerCase());
					if(maybeCell != null){
						elementid = maybeCell.id;
						cell = maybeCell;
						found = true;
					}

					//for NPC, we don't have all teh data.
					//but we can fake it.
					if(!found && klass.name == "npc"){
						cell = {name:elementName, hive:jsondata.npc};
						found = true;
					}
				}
			}
	
			if(found){
				//step 2: create the internal stuff.
				const elementclass = cell.hive.classname;
				let format = CELL_FORMAT_GUIDE;
				if(element.getAttribute("disabled") == "true"){
					format |= CELL_FORMAT_DISABLE_CHECKBOX;
				}

				if(elementclass == "npc"){
					format |= CELL_FORMAT_SKIP_ID;
					format &= ~CELL_FORMAT_SHOW_CHECKBOX;
				}
				let newElement = initSingleCell(cell, null, format);
				element.replaceWith(newElement);
				//step 3: load current data from cookies
				if(newElement == null || elementclass == null){
					debugger;
				}
			}
			else{
				//element not found. skip this iteration and move to the next one.
				element.classList.add("replaceableError");
				let classStuff = {
					clid: checklistid,
					identifiedClass: element?.classList[0],
					contents: element?.innerText,
					context:element.parentElement.innerText
				}
				if(window.debug){
					console.warn("replaceable element not found in reference: ");
					console.warn(classStuff);
				}
			}
		}
	}
	updateUIFromSaveData();
}


/**
 * given a \<span class="npc"\>, attempt to get NPC data.
 * @param {HTMLElement} npcElement 
 */
function getNpcData(npcElement){
	var maybeFormId = npcElement.getAttribute("clid");
	if(maybeFormId != null){
		var maybeNpcData = jsondata.npc?.elements.find(npc=>npc.formId == maybeFormId);
		if(maybeNpcData != null){
			return maybeNpcData;
		}
		else{
			//npc data not found for this formid
			console.error("npc data not found for formId "+maybeFormId);
			return null;
		}
	}
	
	//element didn't have a formid. search by name.
	//maybe we can look up by name
	var npcName = npcElement.innerText;
	var maybeNpcData = jsondata.npc?.elements.find(npc=>npc.name.toLowerCase() == npcName.toLowerCase())
	if(maybeNpcData != null){
		return maybeNpcData;
	}

	//npc data not found by name. could just be missing from our constants data, so provide name for auto-uesp.
	return {name:npcName};
}

/**
 * Recalculate the total progress, and update UI elements.
 */
function recalculateProgressAndUpdateProgressUI(){
	let percentCompleteSoFar = recalculateProgress();
	//round progress to 2 decimal places
	var progress = Math.round((percentCompleteSoFar * 100)*100)/100;
	Array.of(...document.getElementsByClassName("totalProgressPercent")).forEach(element => {
		element.innerHTML = progress.toString();
		if(element.parentElement.className == "topbarSection"){
			element.parentElement.style = `background: linear-gradient(to right, green ${progress.toString()}%, red ${progress.toString()}%);`;
		}
	});
}

/**
 * helper function for updateUIFromSaveData
 * @param {} cell 
 */
function updateHtmlElementFromSaveData(cell){
	const classname = cell.hive.classname
	let usableId = cell.formId;
	if(usableId == null){
		usableId = cell.id;
	}
	let newval = null;
	if(cell.ref == null){
		//we call updateChecklistProgress so indirect elements will update from this
		if(cell.id != null){
			if(savedata[classname] == null){
				debugger;
			}
			newval = savedata[classname][cell.id];
			updateChecklistProgress(null, newval, null, cell, true);
		}
	}
}

/**
 * When savedata is loaded, we need to bulk change all of the HTML to match the savedata state.
 * This function does that.
 */
function updateUIFromSaveData(){
	for(const klass of progressClasses){
		const hive = jsondata[klass.name];
		runOnTree(hive, updateHtmlElementFromSaveData);
	}

	recalculateProgressAndUpdateProgressUI();
}

function checkboxClicked(event){
	const rowHtml = event.target.parentElement;

	var parentid = rowHtml.getAttribute("clid");
	var classname = rowHtml.classList[0];
	updateChecklistProgressFromInputElement(parentid, event.target, classname);
	
	// we need to update because there might be multiple instances of the same book on this page, and we want to check them all.
	recalculateProgressAndUpdateProgressUI();
	saveProgressToCookie();
	if(settings.autoUploadCheck){
		uploadCurrentSave();
	}
}

var __displayingIframe = false;
/**
 * Update iframe visibility
 * @param {boolean} visible should iframe be visible
 */
function updateIframe(visible){
	//if we're not changing the visibility of the iframe, do nothing.
	if(visible == __displayingIframe){
		return;
	}
	if(window.debug){
		let newstate = visible?"on":"off"
		console.log("updating iframe to "+newstate);
	}
	if(visible){
		//iframe going from off to on
		if(document.getElementById("iframeContainer") != null){
			document.getElementById("iframeContainer").style.display = ""
		}
		else{
			var iframeContainer = document.createElement("div");
			iframeContainer.classList.add("resizableContainer");
			iframeContainer.classList.add("sidebarContainer");
			iframeContainer.id = "iframeContainer";

			var myframe = document.createElement("iframe");
			myframe.name="myframe";
			myframe.id="myframe";
			myframe.classList.add("iframe");
			
			iframeContainer.appendChild(myframe);
			iframeContainer.addEventListener('mouseup',(event)=>{
				if(settings.iframeWidth != event.target.style.width){
					settings.iframeWidth = event.target.style.width;
					saveCookie("settings",settings);
				}
			});
			var sidebar = document.getElementById("sidebar");
			if(sidebar != null){
				sidebar.prepend(iframeContainer);
			}
			else{
				document.body.prepend(iframeContainer);
			}
			if(settings?.iframeWidth){
				iframeContainer.style.width = settings.iframeWidth;
			}
		}
		
		//update all _blank links to open in iframe
		var links = document.getElementsByTagName("A");
		for(var lnk of links){
			if(lnk.target == "_blank"){
				lnk.target = "myframe";
			}
		}
		__displayingIframe = true;
	}
	else{
		//iframe going from on to off
		//just hide it because if we go back to large, we don't want to have to reload the iframe.
		document.getElementById("iframeContainer").style.display="none";

		//reset links to open in new tab, otherwise it looks like they're doing nothing.
		var links = document.getElementsByTagName("A");
		for(var lnk of links){
			if(lnk.target == "myframe"){
				lnk.target = "_blank";
			}
		}
		__displayingIframe = false;
	}
}

var windowResizeId = null;
function onWindowResize(event){
	//on window resize, we may want to hide sidebar.
	//only resize after being still for 50ms
	if(windowResizeId != null){
		clearTimeout(windowResizeId);
	}
	windowResizeId = setTimeout(checkIframeSize,50,event);
}

function checkIframeSize(event){
	windowResizeId = null;
	if(settings.iframeCheck == "on" || 
	(settings.iframeCheck == "auto" && window.innerWidth >= settings.iframeMinWidth)){
		updateIframe(true);
	}
	else{
		updateIframe(false);
	}
}

function pushNpcReferencesToMinipage(event){
	const npcData = getNpcData(event.target.parentElement);
	const references = getAllReferencesOnPage(npcData);
	const myframe = document.getElementById("myframe");
	
	myframe.addEventListener('load',()=>{
		myframe.contentWindow.postMessage(references,"*");
		console.log(references);
	},{once:true});
}

function getAllReferencesOnPage(cell){
	var npcLinks = document.getElementsByClassName("npc");
	var refs = [];
	for(var link of npcLinks){
		if(link.innerText == cell.name){
			//TODO: or formId
			refs.push(getElementReferenceLocation(link));
		}
	}
	return refs;
}

function getElementReferenceLocation(obj){
	var parent = obj.parentElement;
	var link = null;
	var path = "";
	
	while(parent != document.body){
		if(parent.id != null && parent.id != ""){
			//ignore duplicate sections of IDs
			if(path.substring(1).startsWith(parent.id)){
				var abridgedPath = path.substring(1+parent.id.length);
				if(abridgedPath[0] == "_"){
					abridgedPath = abridgedPath.substring(1);
				}
				path = "/"+abridgedPath;
			}
			path = "/" + parent.id + path;
			if(link == null) {
				link = parent.id.toString();
			}
		}
		else if(parent.tagName == "LI"){
			const index = Array.prototype.indexOf.call(parent.parentElement.children,parent);
			path = "/"+(index+1)+path;
		}
		
		parent = parent.parentElement;
	}
	return {anchor:link,path:path};
}
