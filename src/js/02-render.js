/* ============================================================
   TOP-LEVEL RENDER
   ============================================================ */
function renderApp(){
  EF_DAY=+state.settings.dayHours||8;renderNewerBar();requestAnimationFrame(v2AfterRender);
  if(view!=="playbook")playTeam=false;
  noteContent();meetingsEffortCatchUp();
  document.querySelectorAll(".navbtn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.querySelector("main").classList.toggle("wide",view==="today"&&benchOn()&&contentCount()>0);
  document.querySelector("main").classList.toggle("effortv",["effort","review","search","month","transports"].includes(view));
  {const k=[view,activeId,activeEpicId,activeMeetingId,activeJournalId,activeDebugId,activePlayId,meetingRollup,journalTodos,document.documentElement.getAttribute("data-theme")].join("|");
   if(k!==renderApp._key){renderApp._key=k;enterPulse("all");const dr=document.getElementById("efDrw");if(dr)dr.classList.remove("on");}}
  if(view==="today"){renderToday();}
  else if(view==="demands"){renderDemandSidebar();renderDetail();}
  else if(view==="debug"){renderDebugSidebar();renderDebugDetail();}
  else if(view==="jobs"){renderJobSidebar();renderJobDetail();}
  else if(view==="journal"){renderJournalSidebar();renderJournalDetail();}
  else if(view==="meetings"){renderMeetingSidebar();renderMeetingDetail();}
  else if(view==="epics"){renderEpicSidebar();renderEpicDetail();}
  else if(view==="playbook"){renderPlaybookSidebar();renderPlaybookDetail();}
  else if(view==="effort"){renderEffortWS();}
  else if(view==="review"){renderReview();}
  else if(view==="search"){renderSearchPage();}
  else if(view==="month"){renderMonth();}
  else if(view==="transports"){renderTrBoard();}
  else{renderVault();}
  renderSaveState();syncRail();updateSb();syncDemandsLayout();efTimerUI();
}

