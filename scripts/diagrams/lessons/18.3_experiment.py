# Experiment for lesson 18.3: every number used in the lesson and its diagrams comes from this script.
import torch
from torch.autograd import Function, gradcheck
from torch.autograd.gradcheck import GradcheckError

print("torch", torch.__version__)

class RoundSTE(Function):
    """round() in the forward pass; straight-through estimator (identity) in the backward pass."""
    @staticmethod
    def forward(ctx, x):
        ctx.save_for_backward(x)
        return torch.round(x)

    @staticmethod
    def backward(ctx, grad_out):
        return grad_out.clone()

class RoundClippedSTE(Function):
    """Same forward; backward passes the gradient only where |x| <= 1."""
    @staticmethod
    def forward(ctx, x):
        ctx.save_for_backward(x)
        return torch.round(x)

    @staticmethod
    def backward(ctx, grad_out):
        (x,) = ctx.saved_tensors
        return grad_out * (x.abs() <= 1).to(grad_out.dtype)

class CubeFn(Function):
    """y = x**3 with the correct backward dy/dx = 3 x**2."""
    @staticmethod
    def forward(ctx, x):
        ctx.save_for_backward(x)
        return x ** 3

    @staticmethod
    def backward(ctx, grad_out):
        (x,) = ctx.saved_tensors
        return grad_out * 3 * x ** 2

class CubeBuggy(Function):
    """Same forward, but the backward forgets the factor 3."""
    @staticmethod
    def forward(ctx, x):
        ctx.save_for_backward(x)
        return x ** 3

    @staticmethod
    def backward(ctx, grad_out):
        (x,) = ctx.saved_tensors
        return grad_out * x ** 2

XS = [0.4, 1.6, 2.5, -0.7]
print("\n== A. forward and gradients on x =", XS)
x = torch.tensor(XS, requires_grad=True)
y = RoundSTE.apply(x)
print("round_ste forward:", y.tolist())
print("round_ste grad_fn:", type(y.grad_fn).__name__)
y.sum().backward()
print("STE grad (identity):", x.grad.tolist())

x = torch.tensor(XS, requires_grad=True)
torch.round(x).sum().backward()
print("true autograd grad of torch.round:", x.grad.tolist())

x = torch.tensor(XS, requires_grad=True)
RoundClippedSTE.apply(x).sum().backward()
print("clipped STE grad (|x|<=1):", x.grad.tolist())

print("\n== B. finite-difference derivative of round (float64, h=1e-6)")
import numpy as np  # NumPy-only version of the same check is shown in the lesson
h = 1e-6
for v in [0.4, 1.6, -0.7, 2.5]:
    d = (np.round(v + h) - np.round(v - h)) / (2 * h)
    print(f"x={v:5.2f}  central difference={d:.1f}")

print("\n== C. tensor hook and gradient accumulation")
x = torch.tensor(XS, requires_grad=True)
seen = []
def halve(g):
    seen.append(g.clone())
    return g * 0.5
h = x.register_hook(halve)
RoundSTE.apply(x).sum().backward()
print("hook saw:", seen[-1].tolist())
print("x.grad after backward 1:", x.grad.tolist())
RoundSTE.apply(x).sum().backward()
print("x.grad after backward 2 (no zeroing):", x.grad.tolist())
x.grad.zero_()
RoundSTE.apply(x).sum().backward()
print("x.grad after zero_() and backward 3:", x.grad.tolist())
h.remove()
x.grad.zero_()
RoundSTE.apply(x).sum().backward()
print("after h.remove(), zero_(), backward:", x.grad.tolist())

print("\n== D. hook on a non-leaf tensor")
x = torch.tensor(XS, requires_grad=True)
y = RoundSTE.apply(x)
y_seen = []
y.register_hook(lambda g: y_seen.append(g.clone()))
y.sum().backward()
print("grad flowing into y:", y_seen[0].tolist())

print("\n== E. gradcheck: verifying a backward against finite differences (float64)")
xd = torch.tensor([0.5, -1.2, 2.0], dtype=torch.float64, requires_grad=True)
print("CubeFn gradcheck:", gradcheck(CubeFn.apply, (xd,)))
try:
    gradcheck(CubeBuggy.apply, (xd,))
    print("CubeBuggy gradcheck: passed")
except GradcheckError as e:
    print("CubeBuggy gradcheck: GradcheckError,", str(e).splitlines()[0])
xs = torch.tensor(XS, dtype=torch.float64, requires_grad=True)
try:
    gradcheck(RoundSTE.apply, (xs,))
    print("RoundSTE gradcheck: passed")
except GradcheckError as e:
    print("RoundSTE gradcheck: GradcheckError,", str(e).splitlines()[0])
