class QRManager:
    """
    Manages the unique identification and counting of QR codes on a conveyor belt.
    """
    def __init__(self):
        self.unique_codes = set()
        self.total_boxes = 0

    def process_code(self, code: str) -> bool:
        """
        Processes a QR code string.
        Returns True if the code is unique (new), False if it's a duplicate.
        """
        cleaned_code = code.strip()
        
        # Skip "NoRead" signals from the scanner
        if not cleaned_code or cleaned_code.lower() == "noread":
            return False
            
        if cleaned_code not in self.unique_codes:
            self.unique_codes.add(cleaned_code)
            self.total_boxes += 1
            return True
        
        return False

    def is_target_reached(self, target: int) -> int:
        """
        Returns 0 if the total count matches or exceeds the target, else 1.
        Inverted logic: 1 initially, 0 upon completion.
        """
        return 0 if self.total_boxes >= target else 1

    def get_total_count(self) -> int:
        """
        Returns the total number of unique boxes detected.
        """
        return self.total_boxes

    def reset(self):
        """
        Resets the tracking set and counter.
        """
        self.unique_codes.clear()
        self.total_boxes = 0


if __name__ == "__main__":
    # Example usage / Simple test
    manager = QRManager()
    
    test_codes = [
        "http://wmsbeta.luxkutumb.info/lux-kutumb?qr=FNCWN100/2/10/0000k7u8/022026;",
        "http://wmsbeta.luxkutumb.info/lux-kutumb?qr=FB32400L/2/10/0000k7ub/022026;",
        "T424F00L/2/10/NDkyNg==/012026;",
        "http://wmsbeta.luxkutumb.info/lux-kutumb?qr=FNCWN100/2/10/0000k7u9/022026;",
        "http://wmsbeta.luxkutumb.info/lux-kutumb?qr=FR32300M/2/10/0000K7U7/022026;",
        "http://wmsbeta.luxkutumb.info/lux-kutumb?qr=FW3240XL/2/10/0000k7uc/022026;"
    ]
    
    print("Starting QR Tracking Simulation...")
    for code in test_codes:
        is_new = manager.process_code(code)
        if is_new:
            print(f"[NEW] Detected unique QR: '{code.strip()}' | Total Boxes: {manager.get_total_count()}")
        else:
            print(f"[DUP] Ignored duplicate QR: '{code.strip()}'")

    print(f"\nFinal Statistics: {manager.get_total_count()} unique boxes detected.")
