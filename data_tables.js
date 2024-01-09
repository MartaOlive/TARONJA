/* 
    This file is part of TAPIS. TAPIS is a web page and a Javascript code 
    that builds queries and explore the STAplus content, saves it as CSV or 
    GeoJSON and connects with the MiraMon Map Browser. While the project is 
    completely independent from the Orange data mining software, it has been 
    inspired by its GUI. The general idea of the application is to be able 
    to work with STA data as tables.
  
    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023 Joan Masó

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    
    The TAPIS can be updated from https://github.com/joanma747/tapis.

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at uab cat) 
    dins del grup del MiraMon. MiraMon és un projecte del 
    CREAF que elabora programari de Sistema d'Informació Geogràfica 
    i de Teledetecció per a la visualització, consulta, edició i anàlisi 
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert. 
    
    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.
    
    El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/

"use strict"

function getJSONType(a) {
	if (typeof a === "string")
		return "string";
	if (typeof a === "boolean")
		return "boolean";
	if (Array.isArray(a))
		return "array";
	if (a===null)
		return "null";
	if (typeof a === "object")
		return "object";
	if (typeof a === "undefined")
		return "undefined";
	if (Number.isInteger(a))
		return "integer";
	if (parseFloat(a))
		return "number"
	else 
		return "string";
}


function getDataAttributesSimple(data) {
	var dataAttributes = {}, dataAttribute, type;

	for (var i = 0; i < data.length; i++) {
		var keys = Object.keys(data[i]);
		for (var k = 0; k < keys.length; k++) {
			if (dataAttributes[keys[k]])
			{
				dataAttribute=dataAttributes[keys[k]];
					type=getJSONType(data[i][keys[k]]);
					if (dataAttribute.type=="null" || dataAttribute.type=="undefined")
						dataAttribute.type=type;
					if (type!="null" && type!="undefined")
					{
						if ( (dataAttribute.type=="boolean" && type!="boolean") ||
							((dataAttribute.type=="integer" || dataAttribute.type=="number") && (type=="object" || type=="array" || type=="string")) ||
							(dataAttribute.type=="string" && (type=="object" || type=="array")) ||
							(dataAttribute.type=="array" && type=="object") )
							dataAttribute.type=type;
						else if (dataAttribute.type=="integer" && type=="number")
							dataAttribute.type="number";
					}
			}
			else
			{
				dataAttributes[keys[k]]={
						type: getJSONType(data[i][keys[k]])
				};
			}
		}
	}
	return dataAttributes;
}

//Return the index on the sorted list array where the value exists. If it does not find ti it returns null.
//If there are repeated hits, it returns the first one
function binarySearch(list, value, fcompare, fparam) {
	var lo = 0, hi = list.length - 1, mid, comp;
	while (lo <= hi) {
		mid = Math.floor((lo+hi)/2);
		comp=fcompare(list[mid], value, fparam);
		if (comp>0)
			hi = mid - 1;
		else if (comp<0)
			lo = mid + 1;
		else
		{
			while (mid>0 && 0==fcompare(list[mid-1], value, fparam))  //looking for the first hit
				mid--;
			return mid;
		}
	}
	return null;
}

function compareRightTable(a, b, options) {
	for (var j=0; j<options.RowMatching.length; j++)
	{
		if (a[options.RowMatching[j].right]<b[options.RowMatching[j].right])
			return -1;
		if (a[options.RowMatching[j].right]>b[options.RowMatching[j].right])
			return 1;
	}
	return 0;
}

function JoinTablesData(dataLeft, dataRight, dataLeftAttributesNull, dataRightAttributesNull, dataCurrentAttributes, options) {
	//Define the dataCurrentAttributes based on the dataLeftAttributes, dataRightAttributes
	var dataLeftAttributes=dataLeftAttributesNull ? dataLeftAttributesNull : getDataAttributesSimple(dataLeft);
	var dataRightAttributes=dataRightAttributesNull ? dataRightAttributesNull : getDataAttributesSimple(dataRight);
	var dataLeftAttributesArray = Object.keys(dataLeftAttributes);
	var dataRightAttributesArray = Object.keys(dataRightAttributes);
	var dataRightNameInJoin=[], dataCurrent=[];
	
	for (var i=0; i<dataLeftAttributesArray.length; i++) {
		dataCurrentAttributes[dataLeftAttributesArray[i]]=deapCopy(dataLeftAttributes[dataLeftAttributesArray[i]]);
	}
	for (var i=0; i<dataRightAttributesArray.length; i++) {
		for (var j=0; j<options.RowMatching.length; j++)
			if (dataRightAttributesArray[i]==options.RowMatching[j].right)
				break; 
		if (j<options.RowMatching.length) {
			dataRightNameInJoin[i]==null;
			continue; //This should be not included as it is already there.
		}
		for (var j=0; j<dataLeftAttributesArray.length; j++) {
			if (dataLeftAttributesArray==dataRightAttributesArray) {
				//Change the name
				dataRightNameInJoin[i]=dataRightAttributesArray+"_"+Math.floor(Math.random() * 100000);
				dataCurrentAttributes[dataRightNameInJoin[i]]=deapCopy(dataRightAttributes[dataRightAttributesArray[i]]);
				break;
			}
		}
		if (j<dataLeftAttributesArray.length) //Already done
			continue;
		//Add
		dataRightNameInJoin[i]=dataRightAttributesArray[i];
		dataCurrentAttributes[dataRightNameInJoin[i]]=deapCopy(dataRightAttributes[dataRightAttributesArray[i]]);
	}
			
	var dataCurrentAttributesArray = Object.keys(dataCurrentAttributes);
	
	//Sort a duplicate of the second tabla by the matching criteria.
	var dataRightSorted=deapCopy(dataRight);
	dataRightSorted.sort(function (a, b) {
		for (var j=0; j<options.RowMatching.length; j++) {
			if (a[options.RowMatching[j].right]<b[options.RowMatching[j].right])
				return -1;
			if (a[options.RowMatching[j].right]>b[options.RowMatching[j].right])
				return 1;
		}
		return 0;});

	if (options.NotMatch=="BothTables") {
		//create a list of future matching not-matching records
		var matchRightRecord=[];
		for (var i=0; i<dataRightAttributesArray.length; i++) {
			matchRightRecord.push(false);
		}
	}
	//Based on the left table look in the right table and populate the result
	var recordRight={}, iRight;
	dataCurrent.length=0;
	for (var j=0; j<dataLeft.length; j++) {
		for (var i=0; i<options.RowMatching.length; i++)
			recordRight[options.RowMatching[i].right]=dataLeft[j][options.RowMatching[i].left];
		iRight=binarySearch(dataRightSorted, recordRight, compareRightTable, options);
		
		if (options.NotMatch=="LeftTable" || options.NotMatch=="BothTables" || iRight!=null) {
			dataCurrent.push(deapCopy(dataLeft[j]));
			if (iRight!=null) {
				while (true)
				{
					if (options.NotMatch=="BothTables")
						matchRightRecord[iRight]=true;
					for (var i=0; i<dataRightAttributesArray.length; i++) {
						if (dataRightNameInJoin[i]!=null)
							dataCurrent[dataCurrent.length-1][dataRightNameInJoin[i]]=dataRightSorted[iRight][dataRightAttributesArray[i]];
					}
					if (iRight+1==dataRightSorted.length || 0!=compareRightTable(dataRightSorted[iRight+1], recordRight, options))  //Are more repeated hits not there?
						break;
					dataCurrent.push(deapCopy(dataLeft[j]));
					iRight++;
				}
			}
		}
	}
	if (options.NotMatch=="BothTables") {
		//Add the records on the second table that never matched
		for (var j=0; j<dataRightSorted.length; j++) {
			if (!matchRightRecord[j]) {
				dataCurrent.push({});
				for (var i=0; i<dataRightAttributesArray.length; i++) {
					if (dataRightNameInJoin[i]!=null)
						dataCurrent[dataCurrent.length-1][dataRightNameInJoin[i]]=dataRightSorted[j][dataRightAttributesArray[i]];
				}
			}
		}
	}
	return dataCurrent;
}

