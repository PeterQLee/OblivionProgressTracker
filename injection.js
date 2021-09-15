
var linkedElements = [];

function LinkedElement(element, classname, id){
	this.element = element;
	this.classname = classname;
	this.id = id;
}


function initInjection(){
	replaceElements();
	linkNPCs();
	initIframe();
}

//initial function to replace element with checkbox n stuff.
function  replaceElements(){
	var replaceableParts = document.getElementsByClassName("replaceable");
	while(replaceableParts.length > 0){
		const element = replaceableParts[0];
		const checklistid = element.getAttribute("clid");
		//step 1: get the target element data.
		var found = false;
		var elementjson = null;
		var elementclass = null;
		var elementid = null;
		for (const classname of standardclasses()){
			if(checklistid?.startsWith(classname)){
				elementid = parseInt(checklistid.substring(classname.length));
				elementjson = findOnTree(jsondata[classname],(x=>x.id == elementid));
				elementclass = classname;
				if(elementjson){found=true;}
				break;
			}
		}
		if(!found){
			if(checklistid?.startsWith("save")){
				elementid = checklistid.substring("save".length);
				elementjson = findOnTree(jsondata["save"], x=>x.id == elementid);
				elementclass = "save";
				found=true;
			}
		}

		if(!found){
			//skip this iteration and move to the next one.
			element.classList.remove("replaceable");
			element.classList.add("replaceableError");
			replaceableParts = document.getElementsByClassName("replaceable");
			console.log("replaceable element "+checklistid+" not found in reference");
			continue;
		}
		//step 2: create the internal stuff.
		element.innerText = "";
		var newElement = initInjectedElement(elementjson, elementclass)
		if(element.getAttribute("disabled") == "true"){
			newElement.children[1].disabled = true;
		}
		element.replaceWith(newElement);
		//step 3: load current data from cookies
		linkedElements.push(new LinkedElement(newElement, elementclass, elementid))
	}
	updateUIFromSaveData2();
}


// given a <span class="npc"></span>, attempt to get NPC data.
function getNpcData(npcElement){
	var maybeFormId = element.getAttribute("formId");
	if(!(maybeFormId == null)){
		var maybeNpcData = jsondata.npc?.elements.find(npc=>npc.formId == maybeFormId);
		if(!(maybeNpcData == null)){
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
	var npcName = element.innerText;
	var maybeNpcData = jsondata.npc?.elements.find(npc=>npc.name.toLowerCase() == npcName.toLowerCase())
	if(!(maybeNpcData == null)){
		return maybeNpcData;
	}

	//npc data not found by name. could just be missing from our constants data, so provide name for auto-uesp.
	return {name:npcName};
}

function linkNPCs(){
	var npcs = document.getElementsByClassName("npc");
	for(element of npcs){
		const npcData = getNpcData(element);
		if(npcData == null){
			continue;
		}
		const linky = createLinkElement(npcData, "npc");
		
		element.innerText = "";
		element.appendChild(linky);
	}
}

function initInjectedElement(rowdata, classname){
	if(rowdata == null){
		console.error("null rowdata for class"+classname);
		return;
	}
	var rowhtml = document.createElement("span");
	rowhtml.classList.add(classname);
	rowhtml.classList.add("item");
	
	rowhtml.setAttribute("clid",classname+rowdata.id);
	
	//name
	var rName = document.createElement("span");
	rName.classList.add(classname+"Name");
	
	rName.appendChild(createLinkElement(rowdata, classname));
	rowhtml.appendChild(rName);
	
	//checkbox
	var rcheck = document.createElement("input")
	if(rowdata.type){
		rcheck.type= rowdata.type;
		rcheck.addEventListener('change',checkboxClicked2);
		rcheck.size=4;
		if(rowdata.max){
			rcheck.max = rowdata.max;
		}
	}
	else{
		rcheck.type="checkbox";
		rcheck.addEventListener('click',checkboxClicked2);
	}
	rcheck.classList.add(classname+"Check")
	rcheck.classList.add("check")
	rowhtml.appendChild(rcheck)
	
	return rowhtml;
}

//create link for a json object. 
//classname is for minipages. ex: book, npc, etc.
function createLinkElement(jsonobject, classname){
	const linky = document.createElement("a");
	
	//so... uh... during transition from id to formid, we gotta do fallbacks n stuff.
	var usableId;
	if(!(jsonobject.formId == null)){
		usableId = jsonobject.formId;
	}
	else{
		usableId = jsonobject.id;
	}
	
	const useMinipage = settings.minipageCheck && (classname == "book" || classname == "npc") && !(usableId == null);
	if(useMinipage){
		linky.href ="./data/minipages/"+classname+"/"+classname+".html?id="+usableId;
	}
	else if(jsonobject.link){
		linky.href = jsonobject.link;
	}
	else{
		linky.href="https://en.uesp.net/wiki/Oblivion:"+jsonobject.name.replaceAll(" ","_");
	}
	
	if(settings.iframeCheck){
		linky.target="myframe";
	}
	else{
		linky.target="_blank";
	}
	
	linky.innerText = jsonobject.name;
	return linky;
}

function updateUIFromSaveData2(){
	//since these pages may contain multiple references to teh same object, we need to
	//do this from the element side, not from the data side.
	for(const linkedElement of linkedElements){
		var checkbox = Array.from(linkedElement.element.children).find(x=>x.tagName=="INPUT");
		if(checkbox.type=="checkbox"){
			checkbox.checked = savedata[linkedElement.classname][linkedElement.id];
			if(checkbox.checked){
				linkedElement.element.classList.add("checked");
			}
			else{
				linkedElement.element.classList.remove("checked");
			}
		}
		else{
			checkbox.value = savedata[linkedElement.classname][linkedElement.id];
		}
	}
}

function setParentChecked(item){
	if(item.checked){
		item.parentElement.classList.add("checked");
	}
	else{
		item.parentElement.classList.remove("checked");
	}
}

function checkboxClicked2(event){
	var parentid = event.target.parentElement.getAttribute("clid");

	//extract what it is from the parent id so we can update progress
	var found = false;
	for (const classname of standardclasses()){
		if(parentid.startsWith(classname)){
			var rowid = parseInt(parentid.substring(classname.length));
			savedata[classname][rowid] = event.target.checked;
			setParentChecked(event.target);
			found=true;
			break;
		}
	}
	if(!found){
		if(parentid.startsWith("save")){
			var rowid = parentid.substring("save".length);
			savedata["save"][rowid] = event.target.valueAsNumber;
			found=true;
		}
		
		if(event.target.id == "placesfoundcheck") {
			savedata["misc"]["placesfound"] = event.target.valueAsNumber;
		}
		if(event.target.id == "nirnrootcheck") {
			savedata["misc"]["nirnroot"] = event.target.valueAsNumber;
		}
	}
	// we need to update because there might be multiple instances of the same book on this page, and we want to check them all.
	updateUIFromSaveData2();
	saveProgress();
}

function initIframe(){
if(settings.iframeCheck){
	var resizableContainer = document.createElement("div");
	resizableContainer.classList.add("resizableContainer");
	resizableContainer.id = "iframeContainer";
	

	var myframe = document.createElement("iframe");
	myframe.name="myframe";
	myframe.id="myframe";
	myframe.classList.add("iframe");
	
	resizableContainer.appendChild(myframe);
	var sidebar = document.getElementById("sidebar");
	if(sidebar != null){
		sidebar.prepend(resizableContainer);
	}
	else{
		document.body.prepend(resizableContainer);
	}
}
}