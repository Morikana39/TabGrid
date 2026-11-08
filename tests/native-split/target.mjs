const label=new URLSearchParams(location.search).get('label') || '';
document.title=`Split test ${label}`;document.querySelector('#label').textContent=`Tab ${label} — created only for the split reorder test.`;
