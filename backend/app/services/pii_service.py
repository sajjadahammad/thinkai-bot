import re
import logging

logger = logging.getLogger(__name__)

# Regular expressions for common PII types
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d[ -]*?){13,16}\b')
SSN_REGEX = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
IP_REGEX = re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b')

# Presidio imports (optional)
PRESIDIO_AVAILABLE = False
analyzer = None
anonymizer = None

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine
    
    analyzer = AnalyzerEngine()
    anonymizer = AnonymizerEngine()
    PRESIDIO_AVAILABLE = True
    logger.info("Presidio Analyzer/Anonymizer loaded successfully.")
except Exception as e:
    logger.warning(f"Presidio not available, using high-performance regex fallback. Error: {e}")


class PIIRedactor:
    """
    A utility class to detect and redact Personally Identifiable Information (PII).
    It attempts to use Presidio Analyzer if installed and loaded, otherwise falls back
    to robust regex-based redaction.
    """
    
    @staticmethod
    def redact(text: str) -> str:
        if not text:
            return ""
            
        # Try Presidio first if available
        if PRESIDIO_AVAILABLE and analyzer and anonymizer:
            try:
                results = analyzer.analyze(text=text, language="en")
                anonymized_result = anonymizer.anonymize(text=text, analyzer_results=results)
                return anonymized_result.text
            except Exception as e:
                logger.error(f"Presidio anonymization failed, using regex fallback: {e}")
                
        # Regex-based fallback redaction
        redacted = text
        
        # Redact Credit Cards
        redacted = CREDIT_CARD_REGEX.sub("[CREDIT_CARD]", redacted)
        
        # Redact SSNs
        redacted = SSN_REGEX.sub("[SSN]", redacted)
        
        # Redact Emails
        redacted = EMAIL_REGEX.sub("[EMAIL]", redacted)
        
        # Redact Phone Numbers
        redacted = PHONE_REGEX.sub("[PHONE]", redacted)
        
        # Redact IP Addresses
        redacted = IP_REGEX.sub("[IP_ADDRESS]", redacted)
        
        return redacted
