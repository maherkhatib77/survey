<?php
/**
 * קובץ בדיקה לאבחון בעיות במאגרי נתונים
 * הפעל בדפדפן: https://yourdomain.com/api/test-sources.php
 */

require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>בדיקת מאגרי נתונים</h1>";
echo "<style>body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; } .success { color: green; } .error { color: red; } .info { color: blue; } pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }</style>";

// בדיקה 1: האם תיקיית data קיימת
echo "<h2>1. בדיקת תיקיות</h2>";
echo "<p>DATA_DIR: <code>" . DATA_DIR . "</code></p>";
echo "<p>SOURCES_DIR: <code>" . SOURCES_DIR . "</code></p>";

if (is_dir(DATA_DIR)) {
    echo "<p class='success'>✅ תיקיית data קיימת</p>";
} else {
    echo "<p class='error'>❌ תיקיית data לא קיימת</p>";
}

if (is_dir(SOURCES_DIR)) {
    echo "<p class='success'>✅ תיקיית sources קיימת</p>";
} else {
    echo "<p class='error'>❌ תיקיית sources לא קיימת</p>";
}

// בדיקה 2: הרשאות כתיבה
echo "<h2>2. בדיקת הרשאות</h2>";
if (is_writable(DATA_DIR)) {
    echo "<p class='success'>✅ ניתן לכתוב לתיקיית data</p>";
} else {
    echo "<p class='error'>❌ לא ניתן לכתוב לתיקיית data</p>";
}

if (is_writable(SOURCES_DIR)) {
    echo "<p class='success'>✅ ניתן לכתוב לתיקיית sources</p>";
} else {
    echo "<p class='error'>❌ לא ניתן לכתוב לתיקיית sources</p>";
}

// בדיקה 3: רשימת מאגרים
echo "<h2>3. רשימת מאגרים</h2>";
$sources = getAllSources();
echo "<p>נמצאו " . count($sources) . " מאגרים</p>";

if (count($sources) > 0) {
    echo "<ul>";
    foreach ($sources as $source) {
        echo "<li>";
        echo "<strong>" . htmlspecialchars($source['name']) . "</strong> (ID: " . htmlspecialchars($source['id']) . ")<br>";
        echo "שדות: " . count($source['fields'] ?? []) . "<br>";
        echo "רשומות: " . ($source['recordCount'] ?? 0);
        echo "</li>";
    }
    echo "</ul>";
} else {
    echo "<p class='error'>❌ לא נמצאו מאגרים</p>";
}

// בדיקה 4: בדיקת מאגר ספציפי
echo "<h2>4. בדיקת מאגר ספציפי</h2>";
if (count($sources) > 0) {
    $testSourceId = $sources[0]['id'];
    echo "<p>בודק מאגר: <strong>" . htmlspecialchars($sources[0]['name']) . "</strong> (ID: " . htmlspecialchars($testSourceId) . ")</p>";
    
    $source = getSource($testSourceId);
    
    if ($source) {
        echo "<p class='success'>✅ המאגר נטען בהצלחה</p>";
        echo "<p>שדות: <pre>" . htmlspecialchars(json_encode($source['fields'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre></p>";
        echo "<p>מספר רשומות: " . count($source['records'] ?? []) . "</p>";
        
        if (isset($source['records']) && count($source['records']) > 0) {
            echo "<p>דוגמה לרשומה ראשונה:</p>";
            echo "<pre>" . htmlspecialchars(json_encode($source['records'][0], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . "</pre>";
        } else {
            echo "<p class='error'>❌ אין רשומות במאגר</p>";
        }
    } else {
        echo "<p class='error'>❌ לא ניתן לטעון את המאגר</p>";
    }
}

// בדיקה 5: בדיקת API
echo "<h2>5. בדיקת API</h2>";
echo "<p>נסה לגשת ל-API ישירות:</p>";
echo "<ul>";
echo "<li><a href='sources.php?action=list' target='_blank'>sources.php?action=list</a> - רשימת מאגרים (דורש התחברות)</li>";
if (count($sources) > 0) {
    echo "<li><a href='sources.php?action=get&id=" . htmlspecialchars($sources[0]['id']) . "' target='_blank'>sources.php?action=get&id=" . htmlspecialchars($sources[0]['id']) . "</a> - מאגר ספציפי</li>";
}
echo "</ul>";

// בדיקה 6: מידע על השרת
echo "<h2>6. מידע על השרת</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'לא ידוע') . "</p>";
echo "<p>Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'לא ידוע') . "</p>";
echo "<p>Current Script: " . __FILE__ . "</p>";

echo "<hr>";
echo "<p><strong>הערות:</strong></p>";
echo "<ul>";
echo "<li>אם אתה רואה שגיאות הרשאות, הרץ את הפקודות הבאות בשרת:</li>";
echo "<li><code>chmod -R 755 data/</code></li>";
echo "<li><code>chown -R www-www-data data/</code> (או <code>chown -R apache data/</code> ב-CentOS)</li>";
echo "<li>אם המאגרים לא נטענים, בדוק את ה-Console בדפדפן (F12) בעת טעינת הסקר</li>";
echo "</ul>";

?>
