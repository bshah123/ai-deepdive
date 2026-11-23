## Chapter 20 Summary — Mathematics for ML

### What you learned

Chapter 20 gave the linear algebra and calculus behind gradient-based training. You computed dot products, cosine similarities and projections, and saw that a least-squares fit is a projection. You factored matrices into eigenvalues and singular values, and used the truncated SVD as the basis of principal component analysis (PCA). You built gradients, Jacobians, Hessians and second-order Taylor expansions. You measured how the condition number bounds error growth and slows gradient descent, and you used quadratic forms and the Rayleigh quotient to decide definiteness and to find the top principal direction.

### Key ideas

- **Dot product and cosine:** the dot product multiplies matching positions and sums them. Cosine similarity divides by both lengths, so it compares direction only (Lesson 20.1).
- **Projection:** the projection of x onto u is p = (x . u)/(u . u) u. The residual is perpendicular to u, and a least-squares fit is the projection of y onto the column span of X (Lesson 20.1).
- **Eigendecomposition:** A = V Lambda V^-1 needs a full set of independent eigenvectors. For a symmetric matrix the eigenvectors can be chosen orthonormal (Lesson 20.2).
- **SVD:** A = U Sigma V^T exists for every real matrix. The squared singular values are the eigenvalues of A^T A (Lesson 20.2).
- **Eckart-Young:** keeping the first k singular terms gives the best rank-k approximation. The Frobenius error is the square root of the sum of the discarded sigma_i^2 (Lesson 20.2).
- **PCA:** it is an SVD of the centred data matrix, and the variance along component i is sigma_i^2/(n-1) (Lesson 20.2).
- **Gradient and Jacobian:** the gradient collects partial derivatives and points uphill. The Jacobian of a map from n inputs to m outputs is m by n, and the chain rule uses its transpose (Lesson 20.3).
- **Hessian and Taylor:** the signs of the Hessian's eigenvalues classify a critical point. The second-order Taylor model predicts a step with error of order the step size cubed (Lesson 20.3).
- **Finite differences:** the step size trades truncation error against round-off. Central differences with h = 1e-5 gave about 11 correct digits in float64 for the example in Lesson 20.3.
- **Condition number:** kappa = sigma_max/sigma_min bounds the relative output error by kappa times the relative input error. Float32 loses most of its digits near kappa of 1e7 to 1e8 (Lesson 20.4).
- **Normal equations:** forming X^T X squares the condition number. Ridge regression adds lambda to every eigenvalue and lowers it (Lesson 20.4).
- **Gradient descent on a quadratic:** with eigenvalues 1 and kappa, the best fixed step needs about 6.9 kappa steps. Momentum reduces this to about sqrt(kappa) (Lesson 20.4).
- **Quadratic forms:** x^T A x depends only on the symmetric part of A. A symmetric matrix is positive definite exactly when all its eigenvalues are positive (Lesson 20.5).
- **Rayleigh-Ritz:** for symmetric A, lambda_min <= x^T A x / x^T x <= lambda_max. The top eigenvector maximises projected variance, which is why PCA keeps it (Lesson 20.5).
- **Library traps:** np.linalg.cholesky and np.linalg.eigh do not check symmetry, so test it first. eigh returns eigenvalues in ascending order, and eig does not guarantee any order (Lesson 20.5).

### Before moving on

- □ I can compute a dot product, a cosine similarity and the projection of x onto u by hand, and check that the residual is perpendicular to u.
- □ I can find the eigenvalues of a 2 by 2 symmetric matrix by hand, and say when a matrix has no eigendecomposition.
- □ I can compute the singular values of a small matrix through A^T A, and state the Frobenius error of a rank-k truncation.
- □ I can write the gradient and Jacobian of a small map, and apply the chain rule with the transposed Jacobian.
- □ I can classify a critical point from the signs of Hessian eigenvalues.
- □ I can compute kappa from singular values, and say when a float32 solve is not trustworthy.
- □ I can decide whether a symmetric matrix is positive definite, and test symmetry before calling Cholesky.
