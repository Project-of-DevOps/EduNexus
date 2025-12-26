$ports = @(3000, 3001, 3002, 4000, 8000)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        Write-Host "Killing processes on port $port : $processes"
        foreach ($processId in $processes) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    else {
        Write-Host "No process found on port $port"
    }
}
Write-Host "Done. You can now run 'npm run dev' to start freshly on default ports."
