$crumbJson = curl.exe -s -c jenkins/cookies.txt http://localhost:8082/crumbIssuer/api/json | ConvertFrom-Json
$crumb = $crumbJson.crumb

# Delete old job
curl.exe -s -b jenkins/cookies.txt -X POST "http://localhost:8082/job/schemind-pipeline/doDelete" -H "Jenkins-Crumb:$crumb"
Write-Host "Deleted old job"

Start-Sleep -Seconds 2

# Get fresh crumb
$crumbJson2 = curl.exe -s -c jenkins/cookies.txt http://localhost:8082/crumbIssuer/api/json | ConvertFrom-Json
$crumb2 = $crumbJson2.crumb

# Create new job with inline script
$result = curl.exe -s -b jenkins/cookies.txt -X POST "http://localhost:8082/createItem?name=schemind-pipeline" -H "Jenkins-Crumb:$crumb2" -H "Content-Type:application/xml" --data-binary "@jenkins/job-config.xml" -w "`nHTTP:%{http_code}"
Write-Host "Create: $result"

Start-Sleep -Seconds 2

# Get fresh crumb for build
$crumbJson3 = curl.exe -s -c jenkins/cookies.txt http://localhost:8082/crumbIssuer/api/json | ConvertFrom-Json
$crumb3 = $crumbJson3.crumb

# Trigger build
$buildResult = curl.exe -s -b jenkins/cookies.txt -X POST "http://localhost:8082/job/schemind-pipeline/build" -H "Jenkins-Crumb:$crumb3" -w "`nHTTP:%{http_code}"
Write-Host "Build: $buildResult"
