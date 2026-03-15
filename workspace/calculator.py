"""Simple Calculator - Created by OpenClaw Agent"""


class Calculator:
    """Basic calculator class with arithmetic operations."""
    
    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        return a + b
    
    def subtract(self, a: float, b: float) -> float:
        """Subtract b from a."""
        return a - b
    
    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers."""
        return a * b
    
    def divide(self, a: float, b: float) -> float:
        """Divide a by b. Returns None if dividing by zero."""
        if b == 0:
            return None
        return a / b


def main():
    """Test the calculator."""
    calc = Calculator()
    
    print("Calculator Test")
    print("-" * 20)
    print(f"5 + 3 = {calc.add(5, 3)}")
    print(f"10 - 4 = {calc.subtract(10, 4)}")
    print(f"6 * 7 = {calc.multiply(6, 7)}")
    print(f"20 / 4 = {calc.divide(20, 4)}")
    print(f"5 / 0 = {calc.divide(5, 0)}")


if __name__ == "__main__":
    main()
