var siteTypes =
{
  CA: 'climateaudit.org',
  CE: 'judithcurry.com',
  Lucia: 'rankexploits.com/musings',
  WUWT: 'wattsupwiththat.com',
  Dev: 'dev.whiteword.com/assist',
}
var hostname = location.hostname
var siteType = 'Unknown'
for (var p in siteTypes) if (siteTypes[p].startsWith(hostname)) siteType = p
if (siteType == 'Dev')
  siteType = location.pathname.split('/')[2].split('.')[0].slice(0,-1)
