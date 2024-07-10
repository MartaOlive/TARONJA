/*
    This file is part of TAPIS. TAPIS is a web page and a Javascript code
    that builds queries and explore the STAplus content, saves it as CSV or
    GeoJSON and connects with the MiraMon Map Browser. While the project is
    completely independent from the Orange data mining software, it has been
    inspired by its GUI. The general idea of the application is to be able
    to work with STA data as tables.

    The TAPIS client is free software under the terms of the MIT License

    Copyright (c) 2023-2024 Joan Masó

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

    Aquest codi JavaScript ha estat idea de Joan Masó Pau (joan maso at ieee org) 
    dins del grup del MiraMon. MiraMon és un projecte del
    CREAF que elabora programari de Sistema d'Informació Geogràfica
    i de Teledetecció per a la visualització, consulta, edició i anàlisi
    de mapes ràsters i vectorials. Aquest progamari programari inclou
    aplicacions d'escriptori i també servidors i clients per Internet.
    No tots aquests productes són gratuïts o de codi obert.

    En particular, el TAPIS es distribueix sota els termes de la llicència MIT.

    El TAPIS es pot actualitzar des de https://github.com/joanma747/tapis.
*/

/*
This library use two main types of data. In general, table functions expect 
these two objects as inputs and respond these as outputs.

"Data tables" (commonly referenced with the parameter 'data' or derivates) are 
an array of records, each on being an object of key and value pairs.
Normaly, the same keys are present in every record, but this is
not required. values are not restricted being numbers, strings or 
objects. See a json schema and examples in /schemas/data_*.json

"Data attributes" (commonly referenced with the parameter 'dataAttributes' 
or derivates), are an object. Every keys of the main object is an object 
that defines the 'type', 'description', 'definition', 'UoM', 'UoMSymbol' 
and 'UoMDefinition'. See a json schema and examples in /schemas/dataAttributes_*.json
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

function deapCopy(o) {
	return JSON.parse(JSON.stringify(o));
}


//options={RowMatching: [{left: "", right: ""}], NotMatch: "LeftTable"}
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

		const AggregationsOptions=[{name: "Mean", desc: "Mean"},
					 {name: "Mode", desc: "Mode"},
					 {name: "FirstValue", desc: "First value"},
					 {name: "Median", desc: "Median"},
					 {name: "StandardDeviation", desc: "Standard deviation"},
					 {name: "LastValue", desc: "Last value"},
					 {name: "Q1", desc: "Q1"},
					 {name: "Variance", desc: "Variance"},
					 {name: "RandomValue", desc: "Random value"},
					 {name: "Q3", desc: "Q3"},
					 {name: "Sum", desc: "Sum"},
					 {name: "CountDefined", desc: "Count defined"},
					 {name: "MinValue", desc: "Min. Value"},
					 {name: "Concatenate", desc: "Concatenate"},
					 {name: "Count", desc: "Count"},
					 {name: "MaxValue", desc: "Max. value"},
					 {name: "Span", desc: "Span"},
					 {name: "ProportionDefined", desc: "Proportion defined"}];
		const GroupByDateTimeOptions=[{name: "Year", desc: "Year"},
					 {name: "Month", desc: "Month"},
					 {name: "Day", desc: "Day"},
					 {name: "Hour", desc: "Hour"},
					 {name: "Minute", desc: "Minute"},
					 {name: "Second", desc: "Second"}];

/*All these functions DO NOT support an array null or will zero elements or with undefined or null element. That is why "CountDefined" and "ProportionDefined" are not defined
  All these functions EXCEPT "Concatenate", "Mode", "Median", "Q1" and "Q3" expect an array of numbers*/

function aggrFuncMean(values){
var r=0;
	for (var i=0; i<values.length; i++)
		r+=values[i];
	return r/values.length;
}

function aggrFuncMode(values){
	//TBD
}

function aggrFuncFirstValue(values){
	return values[0];
}

function aggrFuncMedian(values){
	//TBD
}

function aggrFuncStandardDeviation(values){
	//TBD
}

function aggrFuncLastValue(values){
	return values[values.length-1];
}

function aggrFuncQ1(values){
	//TBD
}

function aggrFuncVariance(values){
	//TBD
}

function aggrFuncRandomValue(values){
	//TBD
}

function aggrFuncQ3(values){
	//TBD
}

function aggrFuncSum(values){
var r=0;
	for (var i=0; i<values.length; i++)
		r+=values[i];
	return r;
}

/*function aggrFuncCountDefined(values){
}*/

function aggrFuncMinValue(values){
var r=values[0];
	for (var i=1; i<values.length; i++) {
		if (r>values[i])
			r=values[i];
	}
	return r
}

function aggrFuncConcatenate(values){
var r="";
	for (var i=0; i<values.length; i++) {
		r=values[i]+" ";
	}
	return r.slice(0, -1);  //remove last character
}

function aggrFuncCount(values){
	return values.length;
}

function aggrFuncMaxValue(values){
var r=values[0];
	for (var i=1; i<values.length; i++) {
		if (r<values[i])
			r=values[i];
	}
	return r;
}

function aggrFuncSpan(values){
var r_max,r_min;

	r_max=r_min=values[0];
	for (var i=1; i<values.length; i++) {
		if (r_min>values[i])
			r_min=values[i];
		else if (r_max<values[i])
			r_max=values[i];
	}
	return r_max-r_min;
}

/*function aggrFuncProportionDefined(values){
}*/

function GroupRecordsData(dataSorted, i_ini, i_end, dataAttributesArray, groupByParams) {
	var record={}, recordSorted=dataSorted[i_ini], aggrFuncName, valuesString=null, values=null, r, countDefined=-1;
	//Populate groupByAttr
	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1)
			record[dataAttributesArray[j]]=recordSorted[dataAttributesArray[j]];
	}
	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.aggregationAttr[dataAttributesArray[j]]) {
			for (var k=0; k<groupByParams.aggregationAttr[dataAttributesArray[j]].length; k++) {
				//Calculate the aggregations
				//Populate the aggregated columns
				aggrFuncName=groupByParams.aggregationAttr[dataAttributesArray[j]][k];
				if (aggrFuncName=="Count")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=i_end-i_ini+1;
				else if (aggrFuncName=="FirstValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[i_ini][dataAttributesArray[j]];
				else if (aggrFuncName=="LastValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[i_end][dataAttributesArray[j]];
				else if (aggrFuncName=="RandomValue")
					record[dataAttributesArray[j]+"_"+aggrFuncName]=dataSorted[Math.floor(Math.random()*(i_end-i_ini+1)+i_ini)][dataAttributesArray[j]];
				else if (aggrFuncName=="CountDefined" || aggrFuncName=="ProportionDefined") {
					if (countDefined==-1) {
						countDefined=0;
						for (var i=i_ini; i<=i_end; i++){
							if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null || dataSorted[i][dataAttributesArray[j]]==="")
								continue;
							countDefined++;
						}
					}
					if (aggrFuncName=="CountDefined")
						record[dataAttributesArray[j]+"_"+aggrFuncName]=countDefined;
					else if (aggrFuncName=="ProportionDefined")
						record[dataAttributesArray[j]+"_"+aggrFuncName]=countDefined/(i_end-i_ini+1)*100;
				}
				else {
					if (aggrFuncName=="Concatenate") {
						r="";
						for (var i=i_ini; i<=i_end; i++){
							if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null)
								continue;
							r+=dataSorted[i][dataAttributesArray[j]] + " ";
						}
						record[dataAttributesArray[j]+"_"+aggrFuncName]=r.slice(0, -1);  //remove last space;
						continue;
					}
					if  (aggrFuncName=="Mode" || aggrFuncName=="Median" || aggrFuncName=="Q1" || aggrFuncName=="Q3") {
						if (valuesString==null) {
							valuesString=[];
							for (var i=i_ini; i<=i_end; i++){
								if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null)
									continue;
								valuesString.push(dataSorted[i][dataAttributesArray[j]]);
							}
						}
						if (valuesString.length==0 || !window["aggrFunc"+aggrFuncName])
							continue;
						record[dataAttributesArray[j]+"_"+aggrFuncName]=window["aggrFunc"+aggrFuncName](valuesString);
					} else {
						if (values==null) {
							values=[];
							for (var i=i_ini; i<=i_end; i++){
								if (typeof dataSorted[i][dataAttributesArray[j]] === "undefined" || dataSorted[i][dataAttributesArray[j]]===null || dataSorted[i][dataAttributesArray[j]]==="")
									continue;
								else if (typeof dataSorted[i][dataAttributesArray[j]] === 'string'){
									r=parseFloat(dataSorted[i][dataAttributesArray[j]]);
									if (isNaN(r))
										continue;
									values.push(r);
								}
								else
									values.push(dataSorted[i][dataAttributesArray[j]]);
							}
						}
						if (values.length==0 || !window["aggrFunc"+aggrFuncName])
							continue;
						record[dataAttributesArray[j]+"_"+aggrFuncName]=window["aggrFunc"+aggrFuncName](values);
					}
				}
			}
		}
	}
	return record;
}

/*var groupByParams={groupByAttr: [],   //Array of column names that should have the same value to group
		groupByDate:"",         //Rounding for the date fields
		aggregationAttr:{}};    //column names and the aggregation method
*/
function GroupByTableData(data, dataAttributesNull, dataCurrentAttributes, groupByParams) {
	var dataAttributes=dataAttributesNull ? dataAttributesNull : getDataAttributesSimple(data);
	var dataAttributesArray = Object.keys(dataAttributes);
	var s, record;

	/*Structure of the table:
		-the grouping collumns
		-columns the statistics of the first aggregation collumn
		-columns the statistics of the second aggregation collumn
		-...
		-tempory collumn with an order (it will be removed before returning).
		Note: that the collumns order of the definion of groupByParams has no influence the order of the output that is determined by the order or the original table.
	*/

	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1)
			dataCurrentAttributes[dataAttributesArray[j]]=deapCopy(dataAttributes[dataAttributesArray[j]]);
	}
	for (var j=0; j<dataAttributesArray.length; j++) {
		if (groupByParams.aggregationAttr[dataAttributesArray[j]]) {
			for (var k=0; k<groupByParams.aggregationAttr[dataAttributesArray[j]].length; k++) {
				s=dataAttributesArray[j]+"_"+groupByParams.aggregationAttr[dataAttributesArray[j]][k];
				dataCurrentAttributes[s]=deapCopy(dataAttributes[dataAttributesArray[j]]);
				//Modify the Attribute description accordingly.
			}
		}
	}

	//Duplicate the table. Any field that is not grouping of aggregating is removed at this stage
	var dataSorted=[], recordSorted;
	//Add a data index column to ensure that the order of the groups is not altered
	for (var i=0; i<data.length; i++) {
		record=data[i];
		recordSorted={};
		for (var j=0; j<dataAttributesArray.length; j++) {
			if (groupByParams.groupByAttr.indexOf(dataAttributesArray[j])!=-1){
				recordSorted[dataAttributesArray[j]]=record[dataAttributesArray[j]];
				continue; // this is necessary to avoid adding this field twice if it is asoo in the aggregationAttr.
			}
			if (groupByParams.aggregationAttr[dataAttributesArray[j]])
				recordSorted[dataAttributesArray[j]]=record[dataAttributesArray[j]];
		}
		recordSorted["$$order$$"]=i;
		dataSorted.push(recordSorted);
	}

	//Sort the data by groupByAttr
	var sortRecords=function (a, b) {
		for (var j=0; j<groupByParams.groupByAttr.length; j++) {
			//groupByDate: TBD
			if (a[groupByParams.groupByAttr[j]]<b[groupByParams.groupByAttr[j]])
				return -1;
			if (a[groupByParams.groupByAttr[j]]>b[groupByParams.groupByAttr[j]])
				return 1;
		}
		return 0;
	}

	dataSorted.sort(function (a, b) {
		var r=sortRecords(a, b);
		if (r!=0)
			return r;
		if (a["$$order$$"]<b["$$order$$"])
			return -1;
		if (a["$$order$$"]>b["$$order$$"])
			return 1;
		return 0;  //Not posible in this case
	});

	//Populate the output data
	var dataCurrent=[], i_ini=0, iniRecord;
	for (var i=1; i<dataSorted.length; i++) {
		iniRecord=dataSorted[i_ini];
		if (0!=sortRecords(iniRecord, dataSorted[i])){
			//records i_ini to i-1 are grouped
			dataCurrent.push(GroupRecordsData(dataSorted, i_ini, i-1, dataAttributesArray, groupByParams));  //Add the record to the result
			i_ini=i;
		}
	}
	dataCurrent.push(GroupRecordsData(dataSorted, i_ini, i-1, dataAttributesArray, groupByParams));  //Add the record to the result
	return dataCurrent;
}

//rowNumbers: Show two numbers as first collumn
//prefix_selectedEntityId, in the radio buttons to select use prefix_selectedEntityId+i as an identifier,
//selectedEntityId index of the selected radio button,
//f_onclickselectEntity: on click function for the radio buttons
//f_onclickselectEntityParam: on click function for the radio buttons parameter (it is an string)
//f_isAttributeAnyURI: function to determine if an attribute is a URI
//f_attributeToHide: function to determine if an attribute should be hidden in the view
		function GetHTMLTable(data, dataAttributesInput, rowNumbers, prefix_selectedEntityId, selectedEntityId, f_onclickselectEntity, f_onclickselectEntityParam, f_isAttributeAnyURI, f_attributeToHide) {
			var dataAttributes = dataAttributesInput ? dataAttributesInput : getDataAttributesSimple(data);
			var cdns=[], needhref=[], record, cell, dataAttribute;
			var dataAttributesArray = Object.keys(dataAttributes);

			cdns.push("<table class='tablesmall'><tr>");
			if (rowNumbers)
				cdns.push("<th></th>");
			if (selectedEntityId!==null && typeof selectedEntityId!=="undefined")
				cdns.push("<th></th>");
			for (var a = 0; a < dataAttributesArray.length; a++) {
				if (f_attributeToHide && f_attributeToHide(dataAttributesArray[a]))
					continue;
				cdns.push("<th>");
				dataAttribute=dataAttributes[dataAttributesArray[a]];
				if (dataAttribute.definition)
					cdns.push("<a href='", dataAttribute.definition, "' target='_blank'>");
				cdns.push(dataAttributesArray[a]);
				if (dataAttribute.definition)
					cdns.push("</a>");
				if (dataAttribute.UoM || dataAttribute.UoMSymbol)
				{
					cdns.push(" (");
					if (dataAttribute.UoMDefinition)
						cdns.push("<a href='", dataAttribute.UoMDefinition, "' target='_blank'>");
					cdns.push(dataAttribute.UoMSymbol ? dataAttribute.UoMSymbol : dataAttribute.UoM);
					if (dataAttribute.UoMDefinition)
						cdns.push("</a>");
					cdns.push(")");
				}
				cdns.push("</th>");
				if (f_isAttributeAnyURI)
					needhref[a]=f_isAttributeAnyURI(dataAttributesArray[a]);
			}

			cdns.push("</tr>");
			for (var i = 0; i < data.length; i++) {
				record=data[i];
				cdns.push("<tr>");
				if (rowNumbers)
					cdns.push("<td align='right'>", i + 1, "</td>");
				if (selectedEntityId!==null && typeof selectedEntityId!=="undefined")
				{
					var s=record["@iot.id"] ? record["@iot.id"] : i;
					cdns.push("<td><input type='radio' name='SelectRowRadio' id='", prefix_selectedEntityId, s, "' ", f_onclickselectEntity ? "onClick='" + f_onclickselectEntity.name + "(\"" + f_onclickselectEntityParam+ "\");' " : "", s == selectedEntityId ? "checked='checked'" : "", "/></td>");
				}
				for (var a = 0; a < dataAttributesArray.length; a++) {
					if (f_attributeToHide && f_attributeToHide(dataAttributesArray[a]))
						continue;
					cell=record[dataAttributesArray[a]];
					cdns.push((dataAttributes[dataAttributesArray[a]].type=="number" || dataAttributes[dataAttributesArray[a]].type=="integer") ? "<td align='right'>" :  "<td>");
					if (typeof cell !== "undefined") {
						if (f_isAttributeAnyURI && needhref[a] && cell.length)
							cdns.push("<a href='", cell, "' target='_blank'>", cell, "</a>");
						else if (typeof cell === "object")
							cdns.push(JSON.stringify(cell));
						else
							cdns.push(cell);
					}
					cdns.push("</td>");
				}
				cdns.push("</tr>");
			}
			cdns.push("</table>");
			return cdns.join("");
		}

function addNewEmptyColumn(data,columnName){
	for (var i=0;i<data.length;i++){
		data[i][columnName]="";
	}
	return data;
}

function addNewColumnWithUniqueValue(data, columnName, uniqueValue){
	for (var i=0;i<data.length;i++){
		data[i][columnName]=uniqueValue;
	}
	return data;
}
function addNewColumnWithAutoincrementalValues(data,columnName,firstValue){

	for (var i=0;i<data.length;i++){
		data[i][columnName]=parseInt(firstValue)+i;
	}
	return data;
}

function addnewColumnSummingColumns(data, columnName,columnsToSum, decimalNumber){
	var sum; 
	//numWithComa, value, num;
	for (var i=0;i<data.length;i++){
		sum=0;
		for (var a=0;a<columnsToSum.length;a++){
			if (typeof data[i][columnsToSum[a]] =="string"){
				sum+=parseFloat(data[i][columnsToSum[a]]);
			}else{
				sum+= data[i][columnsToSum[a]]; //Tal com agafa el CSV mai passarà per aquí perque sempre és STRING
			}
			// value=data[i][columnsToSum[a]];
			// if (value.includes(".")){ //float with .
			// 	num= parseFloat(value);
			// }else if (value.includes(",")){ //Float with ","
        	// 	numWithComa=data[i][columnsToSum[a]];
			// 	num=value.replace(",",".");
			// 	num= parseFloat(numWithComa);
			// }else{ //Integer
			// num= parseInt(value);
			// }
			//sum+=num;
		}
		
		if (decimalNumber){
			data[i][columnName]= sum.toFixed(decimalNumber);
		}else{
			data[i][columnName]= sum;
		}
	}
}

function addnewColumnMultiplyingColumns(data, columnName,columnsToSum, decimalNumber){
	var product; 
	//numWithComa, value, product;
	for (var i=0;i<data.length;i++){
		
		for (var a=0;a<columnsToSum.length;a++){
			if (typeof data[i][columnsToSum[a]] =="string"){
				if (a==0){
					product=parseFloat(data[i][columnsToSum[a]]);
				}else{
					product=product*parseFloat(data[i][columnsToSum[a]]);
				}
			 
			}else{
				if (a==0){
					product=data[i][columnsToSum[a]];
				}else{
					product=product* data[i][columnsToSum[a]]; //Tal com agafa el CSV mai passarà per aquí perque sempre és STRING


				}

			}
		}
		
		if (decimalNumber){
			if (decimalNumber==0){ //round number
				data[i][columnName]= Math.round(product);
			}
			data[i][columnName]= product.toFixed(decimalNumber);
		
		}else{
			data[i][columnName]= product;
		}
	}
}

