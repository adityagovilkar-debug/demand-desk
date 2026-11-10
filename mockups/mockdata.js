/* invented sample data, sized like a few months of real use — no real names, tickets or systems from any data file */
function mockData(){const T=todayStr(),D=n=>efAdd(T,n),ts=(n,h)=>new Date(D(n)+"T"+String(h||10).padStart(2,"0")+":00:00").getTime();
  const st=(to,n,x)=>({ts:ts(n),type:"status",from:"",to,...(x||{})});
  const tr=(num,desc,sys,rel,syncs,o)=>({number:num,desc,system:sys,released:rel,syncs:syncs.map(([s,n])=>({system:s,date:D(n)})),...(o||{})});
  const tasks=[
   {id:"m1",demandId:"10421",title:"Payroll report: cost-centre filter",status:"progress",type:"Report change",theme:"Payroll",requestor:"Payroll team",epicId:"e1",wave:"Wave 1",system:"H03",client:"010",receivedDate:D(-34),dueDate:D(-3),estimate:24,
    nextAction:{date:T,note:"Check QA results with the payroll team"},waiting:{on:"QA team",since:D(-4)},
    timeline:[st("progress",-33),st("delivered",-12),st("bug",-9),st("progress",-8),{ts:ts(-6),type:"note",note:"Next action done: Fix rounding in totals"}],
    objects:[{id:"o1",name:"ZHR_PAYROLL_RPT",type:"Report",action:"Modified"},{id:"o2",name:"ZCL_HR_CC_FILTER",type:"Class",action:"Created"}],
    transports:[tr("H03K900412","HR : 10421 : CC filter : AG07","H03",true,[["H02",-11],["H01",-10]],{objectIds:["o1"]}),tr("H03K900418","HR : 10421 : CC filter : AG08","H03",true,[["H02",-2]],{objectIds:["o2"],tocId:"c1"}),tr("H03K900425","HR : 10421 : CC filter : AG09","H03",true,[],{tocId:"c1"})],
    tocs:[{id:"c1",number:"H03K900499",desc:"ToC — CC filter to every landscape",syncs:["H03","H02","H01","H13","H12","H11","H23","H22","H21","H43","H42","H41"].map((x,i)=>({system:x,date:D(i<3?-1:0)}))}]},
   {id:"m2",demandId:"10433",title:"Leave balance interface to the portal",status:"progress",type:"Interface",theme:"Time",requestor:"Portal team",epicId:"e1",wave:"Wave 2",system:"H03",receivedDate:D(-21),dueDate:D(5),estimate:40,builders:["p1"],
    nextAction:{date:D(2),note:"Review the mapping with the developer"},timeline:[st("progress",-20)],
    objects:[{id:"o3",name:"ZHR_LEAVE_BAL_IF",type:"Function module",action:"Created"},{id:"o4",name:"ZCL_HR_CC_FILTER",type:"Class",action:"Modified"}],
    transports:[tr("H03K900430","HR : 10433 : Leave IF : AG10","H03",true,[["H43",-6],["H42",-3]],{dest:["H43","H42","H41"],objectIds:["o3"]}),tr("H03K900431","HR : 10433 : Leave IF : AG11","H03",true,[["H43",-6]],{dest:["H43","H42","H41"]}),tr("H03K900436","HR : 10433 : Leave IF : AG12","H03",false,[],{dest:["H43","H42","H41"],objectIds:["o4"]})]},
   {id:"m3",demandId:"10450",title:"Travel expense approval: delegate rule",status:"open",type:"Enhancement",theme:"Travel",requestor:"Travel desk",system:"H03",receivedDate:D(-6),dueDate:D(3),timeline:[],transports:[tr("H03K900440","TR : 10450 : Delegate : AG13","H03",false,[])]},
   {id:"m4",demandId:"10450",title:"Travel expense approval: mail template",status:"progress",type:"Enhancement",theme:"Travel",requestor:"Travel desk",system:"H03",receivedDate:D(-6),dueDate:D(9),timeline:[st("progress",-4)],transports:[tr("H03K900441","TR : 10450 : Mail : AG14","H03",true,[["H02",-1]])]},
   {id:"m5",demandId:"10388",title:"Org unit sync: daylight-saving fix",status:"delivered",type:"Bug fix",theme:"Org",requestor:"HR operations",system:"H03",receivedDate:D(-60),dueDate:D(-40),
    timeline:[st("progress",-58),st("delivered",-42)],transports:[tr("H03K900301","HR : 10388 : DST : AG01","H03",true,[["H02",-45],["H01",-42]])]},
   {id:"m6",demandId:"10402",title:"Time evaluation: night-shift premium",status:"bug",type:"Enhancement",theme:"Time",requestor:"Time team",system:"H03",receivedDate:D(-45),dueDate:D(-8),
    timeline:[st("progress",-44),st("delivered",-18),st("bug",-5)],transports:[tr("H03K900350","HR : 10402 : Night shift : AG03","H03",true,[["H02",-18]]),tr("H03K900361","HR : 10402 : Night shift : AG05","H03",true,[])]},
   {id:"m7",demandId:"10466",title:"Benefits enrolment: new plan type",status:"open",type:"Customizing",theme:"Benefits",requestor:"Benefits team",system:"H13",client:"150",receivedDate:D(-2),dueDate:D(20),timeline:[],transports:[]},
   {id:"m8",demandId:"10310",title:"Pension extract: field length",status:"closed",type:"Bug fix",theme:"Payroll",requestor:"Payroll team",system:"H03",receivedDate:D(-90),dueDate:D(-70),
    timeline:[st("progress",-88),st("delivered",-75),st("closed",-60)],transports:[tr("H03K900201","HR : 10310 : Pension : AG00","H03",true,[["H02",-76],["H01",-75]])]}];
  const ef=[];const act=["Analysis","Build","Testing","Build","Debug / fix","Transport & Basis"];
  for(let i=1;i<=70;i++){const d=D(-i),g=efDow(d);if(g===0||g===6)continue;if(i===11||i===12)continue;
    ef.push({date:d,hours:1,bucket:"mtg",activity:"Meetings & admin"});
    const ids=["m1","m2","m4","m6","m3","m5"];const a=ids[i%ids.length],b=ids[(i*3+1)%ids.length];
    ef.push({date:d,hours:3+(i%3),taskId:a,activity:act[i%act.length],note:"Sample work"});ef.push({date:d,hours:2,taskId:b,activity:act[(i+2)%act.length]});
    if(i%5===0)ef.push({date:d,hours:1.5,epicId:"e1",activity:"Meetings & admin"});if(i%4===0)ef.push({date:d,hours:1,jobId:"j1",activity:"Analysis"});}
  return {version:DATA_VERSION,settings:{encryption:false,autosave:true,clients:{H0:["010"],H1:["030","150","190"]}},tasks,
    epics:[{id:"e1",code:"HR-SYNC",name:"HR data sync to the portal",status:"active",role:"lead",targetDate:D(30),waves:[{name:"Wave 1",target:D(-2)},{name:"Wave 2",target:D(25)}],deps:[{team:"Portal vendor",what:"API ready in QA",since:D(-25),expected:D(-3)}],log:[{date:D(-30),kind:"milestone",text:"Kick-off"}]},
           {id:"e2",code:"TRV-26",name:"Travel approvals rework",status:"active",role:"contributor",targetDate:D(55),waves:[],deps:[],log:[]}],
    people:[{id:"p1",name:"Ravi",role:"Developer"},{id:"p2",name:"Meera",role:"Developer"}],
    jobs:[{id:"j1",title:"Check batch job failures with Basis",askedBy:"My manager",source:"call",received:D(-4),due:D(1),status:"progress",brief:"Find out why the nightly job fails on Mondays.",
      log:[{date:D(-4),kind:"call",text:"Asked in the weekly call"},{date:D(-3),kind:"analysis",text:"Job log shows a lock wait"},{date:D(-2),kind:"update",text:"Basis: a backup runs at the same time"}],
      nextAction:{date:T,note:"Confirm the new schedule with Basis"},waiting:{on:"Basis team",since:D(-2)}},
      {id:"j2",title:"Unknown mail to the team mailbox",askedBy:"Team mailbox",source:"email",received:D(-9),due:D(-4),status:"done",closedOn:D(-5),outcome:"It belonged to Finance; forwarded."}],
    meetings:[{id:"mt1",date:D(-1),title:"Weekly sync with my manager",team:"Payroll",taskIds:["m1"],actions:[{text:"Share the QA plan",owner:"Me",due:D(2)}],hours:1},
              {id:"mt2",date:D(-3),title:"Portal vendor alignment",team:"Portal",epicIds:["e1"],actions:[{text:"Send the field list",owner:"Vendor",due:D(-1)}]}],
    journal:[{date:T,title:"Today",body:"QA found a rounding issue; fixed and re-imported."}],todos:[{text:"Renew the training certificate",due:D(6)}],
    debug:[{title:"Rounding in payroll totals",status:"active",taskId:"m1",updatedAt:ts(-20),findings:[{kind:"works",text:"Packed numbers fix it"}]}],
    playbook:[{kind:"freeze",title:"Year-end freeze",from:D(20),to:D(34),systems:["H01","H41"]},{kind:"recurring",title:"Quarterly role review",due:D(12),recur:"quarterly"},{kind:"process",title:"How to request a ToC",steps:[{text:"Raise the request"},{text:"Wait for Basis"}]}],
    credentials:[],efforts:ef,daysOff:[{date:D(-11),kind:"holiday",label:"Public holiday"},{date:D(-12),kind:"leave",label:""}],
    wins:[{date:D(-14),kind:"thanks",text:"Payroll lead thanked me for the quick fix"}],images:[],reviewNotes:{}};}
