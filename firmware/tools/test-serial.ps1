# Quick COM port check: does the ESP32 send ANY bytes after reset pulses?
# Run with board on COM5. Press EN on the board when prompted.
param(
    [string]$Port = "COM5",
    [int]$Baud = 115200
)

Add-Type -AssemblyName System.IO.Ports
$sp = New-Object System.IO.Ports.SerialPort $Port, $Baud, None, 8, one
$sp.ReadTimeout = 500
$sp.WriteTimeout = 500
$sp.Dtr = $false
$sp.Rts = $false

try {
    $sp.Open()
    Write-Host "Opened $Port at $Baud. Press EN (reset) on the board now..."
    # ESP32 DevKit auto-reset sequence (CP210x DTR/RTS -> EN / GPIO0)
    $sp.Dtr = $true
    Start-Sleep -Milliseconds 100
    $sp.Dtr = $false
    $sp.Rts = $true
    Start-Sleep -Milliseconds 100
    $sp.Rts = $false
    Start-Sleep -Milliseconds 300

    $deadline = (Get-Date).AddSeconds(8)
    $total = 0
    while ((Get-Date) -lt $deadline) {
        if ($sp.BytesToRead -gt 0) {
            $buf = New-Object byte[] $sp.BytesToRead
            [void]$sp.Read($buf, 0, $buf.Length)
            $text = [System.Text.Encoding]::UTF8.GetString($buf)
            Write-Host $text -NoNewline
            $total += $buf.Length
        }
        Start-Sleep -Milliseconds 50
    }

    Write-Host ""
    if ($total -eq 0) {
        Write-Host "RESULT: No data on $Port — UART RX may be dead, wrong port, or chip not running."
        Write-Host "Try: different USB cable/port, confirm COM in Device Manager, BOOT+EN then run again."
    } else {
        Write-Host "RESULT: Received $total bytes — USB serial works. Upload issue is bootloader entry only."
    }
} catch {
    Write-Host "ERROR: $_"
    Write-Host "Close PlatformIO Serial Monitor and any app using $Port, then retry."
} finally {
    if ($sp.IsOpen) { $sp.Close() }
}
