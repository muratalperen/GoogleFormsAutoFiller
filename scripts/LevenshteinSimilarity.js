const threshold = 80; // TODO: Not calculated best treshold.

/**
* Find best match for the title over the threshold
* TODO: make formData to more generic data type
*/
function findBestMatch(title, formData) {
    let bestMatch = null;
    let bestScore = 0;

    for (const key in formData) {
        const score = CalculateSimilarity(title.trim(), key.trim());
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = key;
        }
    }

    return bestMatch;
}

/**
* Calculate similarity percent
*/
function CalculateSimilarity(a, b) {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return (1 - distance / maxLength) * 100;
}


/**
* Find levenshtein Distance of two string
* TODO: Might optimizing or caching needed. O(n * m)
*/
function levenshteinDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
            }
        }
    }

    return dp[a.length][b.length];
}

export const GetBestMatch = findBestMatch;